import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

export const ReviewSubmissionScreen = () => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigation = useNavigation();
    const route = useRoute();
    const { jobId, direction } = route.params as { jobId: string, direction: 'REQUESTER_TO_PROVIDER' | 'PROVIDER_TO_REQUESTER' };

    const handleRating = (rate: number) => {
        setRating(rate);
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('Error', 'Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/reviews/${jobId}`, { rating, comment, direction });
            Alert.alert('Success', 'Review submitted successfully!');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data || error.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Submit a Review</Text>
            
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                        <Ionicons 
                            name={star <= rating ? 'star' : 'star-outline'} 
                            size={40} 
                            color={star <= rating ? '#FFD700' : '#888'} 
                        />
                    </TouchableOpacity>
                ))}
            </View>
            
            <TextInput
                style={styles.input}
                placeholder="Leave a comment (optional)"
                placeholderTextColor="#888"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
            />
            
            <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
                <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        padding: 20,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#1E1E1E',
        color: '#fff',
        borderRadius: 8,
        padding: 15,
        textAlignVertical: 'top',
        minHeight: 120,
        marginBottom: 30,
    },
    submitButton: {
        backgroundColor: '#4A90E2',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#333',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
