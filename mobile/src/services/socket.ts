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

  private isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      let payloadStr = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      const str = parts[1].replace(/=/g, '').replace(/-/g, '+').replace(/_/g, '/');
      let output = '';
      let bc = 0;
      let bs = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const idx = chars.indexOf(char);
        if (idx === -1) continue;
        bs = bc % 4 ? bs * 64 + idx : idx;
        if (bc++ % 4) {
          output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
      }
      payloadStr = output;
      
      const payload = JSON.parse(payloadStr);
      if (!payload.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < (currentTime + 15);
    } catch {
      return true;
    }
  }

  private async refreshExpiredToken(): Promise<boolean> {
    try {
      const getAuthStore = () => require('../store/authStore').useAuthStore;
      const authStore = getAuthStore().getState();
      const refreshToken = authStore.refreshToken;
      if (!refreshToken) {
        console.warn('STOMP: No refresh token available to refresh STOMP connection.');
        return false;
      }
      
      console.log('STOMP: Proactively refreshing expired token before connecting...');
      const response = await fetch(`${ENV.apiBaseUrl ?? 'http://10.183.224.182:8080'}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.accessToken;
        if (newAccessToken) {
          await authStore.updateAccessToken(newAccessToken);
          this.token = newAccessToken;
          console.log('STOMP: Proactive token refresh successful.');
          return true;
        }
      } else {
        console.warn('STOMP: Proactive token refresh failed with status:', response.status);
      }
    } catch (e) {
      console.warn('STOMP: Error during proactive token refresh:', e);
    }
    return false;
  }

  public async connect(token?: string, onConnect?: () => void, onDisconnect?: () => void) {
    if (onConnect) this.onConnectCallback = onConnect;
    if (onDisconnect) this.onDisconnectCallback = onDisconnect;
    if (token) this.token = token;

    if (this.isTokenExpired(this.token)) {
      const refreshed = await this.refreshExpiredToken();
      if (!refreshed) {
        console.warn('STOMP: Authentication token is expired and proactive refresh failed. Aborting connection.');
        return;
      }
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.connected && this.onConnectCallback) {
        this.onConnectCallback();
      }
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
      if (typeof event.data === 'string') {
        this.handleMessage(event.data);
      } else if (event.data && typeof event.data.text === 'function') {
        event.data.text().then((txt: string) => this.handleMessage(txt));
      }
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

    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`STOMP: Sending SUBSCRIBE for ${destination} (subId: ${subId})`);
      this.sendFrame('SUBSCRIBE', {
        id: subId,
        destination: destination,
        ack: 'auto',
      });
    } else {
      console.log(`STOMP: Queued SUBSCRIBE for ${destination} until CONNECTED`);
    }

    return subId;
  }

  public unsubscribe(subId: string) {
    if (this.subscriptions.has(subId)) {
      const sub = this.subscriptions.get(subId);
      this.subscriptions.delete(subId);
      if (this.connected && sub) {
        console.log(`STOMP: Sending UNSUBSCRIBE for ${sub.destination} (subId: ${subId})`);
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

    let frameStr = `${command}\n`;
    for (const [key, value] of Object.entries(headers)) {
      frameStr += `${key}:${value}\n`;
    }
    frameStr += `\n${body}`;

    // Convert text part to UTF-8 bytes
    let strBytes: Uint8Array;
    if (typeof TextEncoder !== 'undefined') {
      strBytes = new TextEncoder().encode(frameStr);
    } else {
      // Polyfill UTF-8 encoding for React Native environments without global TextEncoder
      const utf8: number[] = [];
      for (let i = 0; i < frameStr.length; i++) {
        let charcode = frameStr.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        } else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        } else {
          i++;
          charcode = 0x10000 + (((charcode & 0x33f) << 10) | (frameStr.charCodeAt(i) & 0x33f));
          utf8.push(
            0xf0 | (charcode >> 18),
            0x80 | ((charcode >> 12) & 0x3f),
            0x80 | ((charcode >> 6) & 0x3f),
            0x80 | (charcode & 0x3f)
          );
        }
      }
      strBytes = new Uint8Array(utf8);
    }

    // Append literal NUL octet (0x00) for STOMP frame termination
    const frameBytes = new Uint8Array(strBytes.length + 1);
    frameBytes.set(strBytes, 0);
    frameBytes[strBytes.length] = 0;

    // Send as ArrayBuffer to bypass React Native JNI C-string null truncation
    this.ws.send(frameBytes.buffer);
  }


  private handleMessage(data: string) {
    if (!data) return;

    // Normalize CRLF to LF and strip NUL bytes
    const cleanData = data.replace(/\0/g, '').replace(/\r\n/g, '\n');
    
    const doubleNewlineIndex = cleanData.indexOf('\n\n');
    if (doubleNewlineIndex === -1) return;

    const headerPart = cleanData.substring(0, doubleNewlineIndex);
    const bodyPart = cleanData.substring(doubleNewlineIndex + 2);

    const lines = headerPart.split('\n');
    const command = lines[0].trim();
    
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
      console.log('STOMP: Connected successfully! Flushing subscriptions...');
      this.connected = true;
      if (this.onConnectCallback) this.onConnectCallback();

      // Resubscribe to all active subscriptions
      this.subscriptions.forEach((sub, subId) => {
        console.log(`STOMP: Flushing SUBSCRIBE for ${sub.destination} (subId: ${subId})`);
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
      console.warn('STOMP: Received ERROR frame:', messageHeader, bodyPart);
      
      const fullError = `${messageHeader}\n${bodyPart}`.toLowerCase();
      // Only abort connection & clear token if it's a true CONNECT authentication failure
      const isAuthFailure = 
        fullError.includes('auth failed') || 
        fullError.includes('jwt') || 
        fullError.includes('token expired') || 
        fullError.includes('missing or invalid authorization') ||
        fullError.includes('user not authenticated');

      if (isAuthFailure) {
        console.warn('STOMP: Authentication failure. Aborting reconnect loop.');
        this.disconnect();
      }
    }
  }


  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.token) {
        await this.connect(this.token);
      }
    }, 5000); // Reconnect in 5 seconds
  }
}

export const stompClient = new StompClient();
