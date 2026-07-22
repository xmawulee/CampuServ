/**
 * DESIGN DECISION: Custom STOMP Client
 * 
 * We intentionally use this custom hand-rolled STOMP client (`socket.ts`) instead of `@stomp/stompjs`.
 * Prior project history showed that the `@stomp/stompjs` library had integration issues in React Native,
 * and critical bugs (such as reconnection/heartbeat recovery and token-based connection setup) were
 * successfully fixed and stabilized directly in this custom implementation.
 * 
 * The `@stomp/stompjs` dependency has been retired and removed from the package.json.
 */

import ENV from '../config/env';

export interface StompMessage {
  id?: string;
  threadId?: string;
  senderId: string;
  type: 'TEXT' | 'VOICE_NOTE' | 'SYSTEM';
  content?: string;
  messageText?: string; // Fallback mapping
  mediaUrl?: string;
  mediaDurationSeconds?: number;
  status: 'SENT';
  createdAt?: string;
}

type MessageCallback = (message: any) => void;

class StompClient {
  private ws: WebSocket | null = null;
  private url: string;
  private connected: boolean = false;
  private token: string | null = null;
  private subscriptions: Map<string, { destination: string; callback: MessageCallback }> = new Map();
  private subIdCounter = 0;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  private reconnectTimer: any = null;

  constructor() {
    this.url = ENV.wsBaseUrl ?? 'ws://localhost:8086/chats/ws/connect';
  }

  public connect(token?: string, onConnect?: () => void, onDisconnect?: () => void) {
    if (onConnect) this.onConnectCallback = onConnect;
    if (onDisconnect) this.onDisconnectCallback = onDisconnect;
    if (token) this.token = token;

    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.onConnectCallback) this.onConnectCallback();
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('STOMP: WebSocket is already connecting...');
      return;
    }

    console.log(`STOMP: Connecting to ${this.url}...`);
    const options: any = {
      headers: {
        'Bypass-Tunnel-Reminder': 'true'
      }
    };
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    const wsInstance = new (WebSocket as any)(this.url, undefined, options);
    this.ws = wsInstance;

    wsInstance.onopen = () => {
      console.log('STOMP: Socket opened. Sending CONNECT frame...');
      const headers: Record<string, string> = {
        'accept-version': '1.1,1.2',
        host: 'localhost',
        'heart-beat': '10000,10000',
      };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      this.sendFrame('CONNECT', headers);
    };

    wsInstance.onmessage = (event: any) => {
      this.handleMessage(event.data as string);
    };

    wsInstance.onerror = (error: any) => {
      // Changed to console.log to avoid React Native LogBox spam during transient connection failures (e.g. backend restarting, 503s)
      console.log('STOMP: WebSocket error', error?.message || 'Connection refused or dropped');
    };

    wsInstance.onclose = (event: any) => {
      console.log('STOMP: Socket closed', event.code, event.reason);
      this.connected = false;
      if (this.onDisconnectCallback) this.onDisconnectCallback();

      // Abort reconnect if the connection was rejected due to authentication
      if (event.reason && typeof event.reason === 'string' && event.reason.includes('401')) {
        console.warn('STOMP: Authentication failed (401). Aborting reconnect loop.');
        this.token = null;
        return;
      }

      this.scheduleReconnect();
    };
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      // Temporarily remove onclose listener to avoid auto-reconnect trigger on manual disconnect
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.token = null;
  }

  public subscribe(destination: string, callback: MessageCallback): string {
    const subId = `sub-${this.subIdCounter++}`;
    this.subscriptions.set(subId, { destination, callback });

    if (this.connected) {
      this.sendFrame('SUBSCRIBE', {
        id: subId,
        destination: destination,
        ack: 'auto',
      });
    }

    return subId;
  }

  public unsubscribe(subId: string) {
    if (this.subscriptions.has(subId)) {
      this.subscriptions.delete(subId);
      if (this.connected) {
        this.sendFrame('UNSUBSCRIBE', { id: subId });
      }
    }
  }

  public sendMessage(destination: string, body: any) {
    this.sendFrame('SEND', {
      destination: destination,
      'content-type': 'application/json',
    }, JSON.stringify(body));
  }

  private sendFrame(command: string, headers: Record<string, string>, body: string = '') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('STOMP: Cannot send frame. WebSocket is not open.');
      return;
    }

    let frame = `${command}\n`;
    for (const [key, value] of Object.entries(headers)) {
      frame += `${key}:${value}\n`;
    }
    frame += `\n${body}\x00`;
    this.ws.send(frame);
  }

  private handleMessage(data: string) {
    // Parse STOMP Frame
    const nullByteIndex = data.indexOf('\x00');
    const cleanData = nullByteIndex !== -1 ? data.substring(0, nullByteIndex) : data;
    
    const doubleNewlineIndex = cleanData.indexOf('\n\n');
    if (doubleNewlineIndex === -1) return;

    const headerPart = cleanData.substring(0, doubleNewlineIndex);
    const bodyPart = cleanData.substring(doubleNewlineIndex + 2);

    const lines = headerPart.split('\n');
    const command = lines[0];
    
    const headers: Record<string, string> = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    if (command === 'CONNECTED') {
      console.log('STOMP: Connected successfully!');
      this.connected = true;
      if (this.onConnectCallback) this.onConnectCallback();

      // Resubscribe to all active subscriptions
      this.subscriptions.forEach((sub, subId) => {
        this.sendFrame('SUBSCRIBE', {
          id: subId,
          destination: sub.destination,
          ack: 'auto',
        });
      });
    } else if (command === 'MESSAGE') {
      const subscriptionId = headers['subscription'];
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        try {
          const parsedBody = JSON.parse(bodyPart);
          
          // Backwards compatibility mapping for text messages
          if (parsedBody.content && !parsedBody.messageText) {
            parsedBody.messageText = parsedBody.content;
          } else if (parsedBody.messageText && !parsedBody.content) {
            parsedBody.content = parsedBody.messageText;
          }
          
          sub.callback(parsedBody);
        } catch (e) {
          console.warn('STOMP: Failed to parse body as JSON', e, bodyPart);
        }
      }
    } else if (command === 'ERROR') {
      const messageHeader = headers['message'] || '';
      console.warn('STOMP: Received ERROR frame:', messageHeader);
      
      const errMsg = `${messageHeader}\n${bodyPart}`.toLowerCase();
      // If it's an authentication or connection interceptor error, stop reconnecting and clear the token to prevent DDOSing the server
      if (
        errMsg.includes('auth') || 
        errMsg.includes('expired') || 
        errMsg.includes('unauthorized') || 
        errMsg.includes('clientinboundchannel')
      ) {
        console.warn('STOMP: Authentication/Authorization/Channel failure. Aborting reconnect loop.');
        this.disconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token) {
        this.connect(this.token);
      }
    }, 5000); // Reconnect in 5 seconds
  }
}

export const stompClient = new StompClient();
