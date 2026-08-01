package com.knust.campusserv.auth.config;

import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
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
    public FanoutExchange accountDeletionExchange() {
        return new FanoutExchange("account.deletion.exchange");
    }

    @Bean
    public Queue accountDeletionAcknowledgmentQueue() {
        return QueueBuilder.durable("account.deletion.acknowledgment").build();
    }
}
