package com.knust.campusserv.request.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    /** Exchange used to broadcast bid-placed events to the supporting-service WebSocket relay. */
    public static final String BID_PLACED_EXCHANGE = "bid.placed";

    @Bean
    public TopicExchange bidPlacedExchange() {
        return new TopicExchange(BID_PLACED_EXCHANGE, true, false);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange("dlx");
    }

    @Bean
    public FanoutExchange accountDeletionExchange() {
        return new FanoutExchange("account.deletion.exchange");
    }

    @Bean
    public Queue requestServiceDeletionQueue() {
        return QueueBuilder.durable("request-service.account.deletion")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "request-service.account.deletion.dlq")
                .build();
    }

    @Bean
    public Queue requestServiceDeletionDlq() {
        return QueueBuilder.durable("request-service.account.deletion.dlq").build();
    }

    @Bean
    public Binding requestServiceDeletionDlqBinding(Queue requestServiceDeletionDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(requestServiceDeletionDlq).to(deadLetterExchange).with("request-service.account.deletion.dlq");
    }

    @Bean
    public Binding requestServiceDeletionBinding(Queue requestServiceDeletionQueue, FanoutExchange accountDeletionExchange) {
        return BindingBuilder.bind(requestServiceDeletionQueue).to(accountDeletionExchange);
    }
}
