package com.knust.campusserv.user.config;

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
    public Queue providerVerificationQueue() {
        return QueueBuilder.durable("provider.verification")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "provider.verification.dlq")
                .build();
    }

    @Bean
    public Queue providerVerificationDlq() {
        return QueueBuilder.durable("provider.verification.dlq").build();
    }

    @Bean
    public Binding providerVerificationDlqBinding(Queue providerVerificationDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(providerVerificationDlq).to(deadLetterExchange).with("provider.verification.dlq");
    }

    @Bean
    public Queue userStatusUpdatedQueue() {
        return QueueBuilder.durable("user.status.updated")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "user.status.updated.dlq")
                .build();
    }

    @Bean
    public Queue userStatusUpdatedDlq() {
        return QueueBuilder.durable("user.status.updated.dlq").build();
    }

    @Bean
    public Binding userStatusUpdatedDlqBinding(Queue userStatusUpdatedDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(userStatusUpdatedDlq).to(deadLetterExchange).with("user.status.updated.dlq");
    }

    @Bean
    public Queue providerReviewSubmittedQueue() {
        return QueueBuilder.durable("provider.review.submitted")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "provider.review.submitted.dlq")
                .build();
    }

    @Bean
    public Queue providerReviewSubmittedDlq() {
        return QueueBuilder.durable("provider.review.submitted.dlq").build();
    }

    @Bean
    public Binding providerReviewSubmittedDlqBinding(Queue providerReviewSubmittedDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(providerReviewSubmittedDlq).to(deadLetterExchange).with("provider.review.submitted.dlq");
    }

    @Bean
    public TopicExchange providerVerificationExchange() {
        return new TopicExchange("provider.verification");
    }

    @Bean
    public Binding providerVerificationBinding(Queue providerVerificationQueue, TopicExchange providerVerificationExchange) {
        return BindingBuilder.bind(providerVerificationQueue).to(providerVerificationExchange).with("#");
    }
}
