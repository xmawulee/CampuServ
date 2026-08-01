package com.knust.campusserv.job.config;

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
    public FanoutExchange accountDeletionExchange() {
        return new FanoutExchange("account.deletion.exchange");
    }

    @Bean
    public Queue jobServiceDeletionQueue() {
        return QueueBuilder.durable("job-service.account.deletion")
                .withArgument("x-dead-letter-exchange", "dlx")
                .withArgument("x-dead-letter-routing-key", "job-service.account.deletion.dlq")
                .build();
    }

    @Bean
    public Queue jobServiceDeletionDlq() {
        return QueueBuilder.durable("job-service.account.deletion.dlq").build();
    }

    @Bean
    public Binding jobServiceDeletionDlqBinding(Queue jobServiceDeletionDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(jobServiceDeletionDlq).to(deadLetterExchange).with("job-service.account.deletion.dlq");
    }

    @Bean
    public Binding jobServiceDeletionBinding(Queue jobServiceDeletionQueue, FanoutExchange accountDeletionExchange) {
        return BindingBuilder.bind(jobServiceDeletionQueue).to(accountDeletionExchange);
    }
}
