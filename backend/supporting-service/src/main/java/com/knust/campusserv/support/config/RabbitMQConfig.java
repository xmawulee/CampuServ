package com.knust.campusserv.support.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String ADMIN_NOTIFICATIONS_EXCHANGE = "admin.notifications";
    public static final String ADMIN_QUEUE = "admin_notifications_queue";

    public static final String PROVIDER_VERIFICATION_EXCHANGE = "provider.verification";
    public static final String PROVIDER_VERIFICATION_QUEUE = "provider_verification_queue";

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange("dlx");
    }

    @Bean
    public TopicExchange adminNotificationsExchange() {
        return new TopicExchange(ADMIN_NOTIFICATIONS_EXCHANGE);
    }

    @Bean
    public Queue adminQueue() {
        return QueueBuilder.durable(ADMIN_QUEUE)
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", ADMIN_QUEUE + ".dlq")
                .build();
    }

    @Bean
    public Queue adminQueueDlq() {
        return QueueBuilder.durable(ADMIN_QUEUE + ".dlq").build();
    }

    @Bean
    public Binding adminQueueDlqBinding(Queue adminQueueDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(adminQueueDlq).to(deadLetterExchange).with(ADMIN_QUEUE + ".dlq");
    }

    @Bean
    public Queue jobStatusQueue() {
        return QueueBuilder.durable("job-status-queue")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "job-status-queue.dlq")
                .build();
    }

    @Bean
    public Queue jobStatusDlq() {
        return QueueBuilder.durable("job-status-queue.dlq").build();
    }

    @Bean
    public Binding jobStatusDlqBinding(Queue jobStatusDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(jobStatusDlq).to(deadLetterExchange).with("job-status-queue.dlq");
    }

    @Bean
    public Binding adminQueueBinding(Queue adminQueue, TopicExchange adminNotificationsExchange) {
        return BindingBuilder.bind(adminQueue).to(adminNotificationsExchange).with("#");
    }

    @Bean
    public Binding jobStatusQueueBinding(Queue jobStatusQueue, TopicExchange adminNotificationsExchange) {
        return BindingBuilder.bind(jobStatusQueue).to(adminNotificationsExchange).with("#");
    }

    @Bean
    public TopicExchange providerVerificationExchange() {
        return new TopicExchange(PROVIDER_VERIFICATION_EXCHANGE);
    }

    @Bean
    public Queue providerVerificationQueue() {
        return QueueBuilder.durable(PROVIDER_VERIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", PROVIDER_VERIFICATION_QUEUE + ".dlq")
                .build();
    }

    @Bean
    public Queue providerVerificationDlq() {
        return QueueBuilder.durable(PROVIDER_VERIFICATION_QUEUE + ".dlq").build();
    }

    @Bean
    public Binding providerVerificationDlqBinding(Queue providerVerificationDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(providerVerificationDlq).to(deadLetterExchange).with(PROVIDER_VERIFICATION_QUEUE + ".dlq");
    }

    @Bean
    public Binding providerVerificationBinding(@org.springframework.beans.factory.annotation.Qualifier("providerVerificationQueue") Queue providerVerificationQueue, @org.springframework.beans.factory.annotation.Qualifier("providerVerificationExchange") TopicExchange providerVerificationExchange) {
        return BindingBuilder.bind(providerVerificationQueue).to(providerVerificationExchange).with("#");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
