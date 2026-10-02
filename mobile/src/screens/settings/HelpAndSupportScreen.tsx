import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../styles/ThemeContext';
import { useToast } from '../../styles/ToastContext';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const COMPLAINT_TYPES = [
    'Service Quality',
    'Payment Issue',
    'Technical Problem',
    'Provider Behavior',
    'Other'
];

export default function HelpAndSupportScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();

    const [complaintType, setComplaintType] = useState(COMPLAINT_TYPES[0]);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    
    const [incidentDate, setIncidentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [requestRefund, setRequestRefund] = useState(false);
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || incidentDate;
        setShowDatePicker(Platform.OS === 'ios');
        setIncidentDate(currentDate);
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            showToast({ status: 'error', title: 'Error', subtitle: 'Please provide a description of the issue.' });
            return;
        }

        setIsSubmitting(true);
        try {
            // First, create the dispute/complaint
            const response = await api.post('/disputes', {
                reason: description.trim(),
                complaintType: complaintType,
                incidentDate: incidentDate.toISOString(),
                requestRefund: requestRefund ? 'true' : 'false'
            });

            const disputeId = response.data.id;

            // Then upload evidence images if any
            for (const uri of images) {
                // In production, this would use FormData. We mock it for the demo per current API constraints
                await api.post(`/disputes/${disputeId}/evidence`, {
                    fileUrl: uri, // Mock URL
                    description: 'User uploaded evidence'
                });
            }

            showToast({ status: 'success', title: 'Ticket Submitted', subtitle: 'Our support team will get back to you shortly.', duration: 4000 });
            navigation.goBack();
        } catch (error: any) {
            console.error('Support submission error:', error);
            showToast({ status: 'error', title: 'Submission Failed', subtitle: error?.response?.data || 'An error occurred while submitting your ticket.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomWidth: 0, backgroundColor: colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Submit a Complaint</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Please provide the details below so we can assist you better.
                </Text>

                {/* Complaint Type */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Complaint Type</Text>
                    <TouchableOpacity 
                        style={[styles.selector, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                        onPress={() => setShowTypeSelector(!showTypeSelector)}
                    >
                        <Text style={{ color: colors.text }}>{complaintType}</Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    {showTypeSelector && (
                        <View style={[styles.dropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            {COMPLAINT_TYPES.map((type, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setComplaintType(type);
                                        setShowTypeSelector(false);
                                    }}
                                >
                                    <Text style={{ color: type === complaintType ? colors.primary : colors.text }}>
                                        {type}
                                    </Text>
                                    {type === complaintType && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Date of Incident */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Date of Incident</Text>
                    <TouchableOpacity 
                        style={[styles.selector, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>{incidentDate.toLocaleDateString()}</Text>
                        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={incidentDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                {/* Request Refund */}
                <View style={[styles.switchRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <View style={[styles.menuIconWrap, { backgroundColor: colors.primary, marginRight: 12 }]}>
                        <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Request Refund</Text>
                        <Text style={[styles.subText, { color: colors.textMuted }]}>Only applicable for payment issues</Text>
                    </View>
                    <Switch
                        value={requestRefund}
                        onValueChange={setRequestRefund}
                        trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: colors.primary }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor={isDark ? '#374151' : '#E5E7EB'}
                    />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                    <TextInput
                        style={[styles.textArea, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                        placeholder="Please describe what happened in detail..."
                        placeholderTextColor={colors.placeholderText}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Image Upload */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Evidence / Screenshots (Optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imagePreviewContainer}>
                                <Image source={{ uri }} style={styles.imagePreview} />
                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {images.length < 3 && (
                            <TouchableOpacity 
                                style={[styles.addImageBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]} 
                                onPress={pickImage}
                            >
                                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>Add Image</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                {/* Submit Button */}
                <TouchableOpacity 
                    style={[
                        styles.submitButton, 
                        { backgroundColor: colors.primary },
                        isSubmitting && { opacity: 0.7 }
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Text>
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        width: 40,
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dropdown: {
        borderWidth: 1,
        borderRadius: 12,
        marginTop: 8,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
    },
    subText: {
        fontSize: 12,
    },
    menuIconWrap: { 
        width: 38, 
        height: 38, 
        borderRadius: 12, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 120,
        fontSize: 15,
    },
    imageScroll: {
        flexDirection: 'row',
    },
    imagePreviewContainer: {
        marginRight: 12,
        position: 'relative',
    },
    imagePreview: {
        width: 90,
        height: 90,
        borderRadius: 12,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
    },
    addImageBtn: {
        width: 90,
        height: 90,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
