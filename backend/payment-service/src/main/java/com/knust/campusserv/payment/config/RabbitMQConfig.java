package com.knust.campusserv.payment.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
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
    public Queue paymentServiceDeletionQueue() {
        return QueueBuilder.durable("payment-service.account.deletion")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "payment-service.account.deletion.dlq")
                .build();
    }

    @Bean
    public Queue paymentServiceDeletionDlq() {
        return QueueBuilder.durable("payment-service.account.deletion.dlq").build();
    }

    @Bean
    public Binding paymentServiceDeletionDlqBinding(Queue paymentServiceDeletionDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(paymentServiceDeletionDlq).to(deadLetterExchange).with("payment-service.account.deletion.dlq");
    }

    @Bean
    public Binding paymentServiceDeletionBinding(Queue paymentServiceDeletionQueue, FanoutExchange accountDeletionExchange) {
        return BindingBuilder.bind(paymentServiceDeletionQueue).to(accountDeletionExchange);
    }
}
