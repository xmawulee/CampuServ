import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

export const DisputeThreadScreen = () => {
    const route = useRoute();
    const { disputeId } = route.params as { disputeId: string };
    
    const [disputeData, setDisputeData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        loadDispute();
    }, [disputeId]);

    const loadDispute = async () => {
        try {
            const res = await api.get(`/disputes/${disputeId}`);
            setDisputeData(res.data);
        } catch (error) {
            console.error("Failed to load dispute", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
            </View>
        );
    }

    if (!disputeData || !disputeData.dispute) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Dispute not found</Text>
            </View>
        );
    }

    const { dispute, evidence } = disputeData;

    const renderEvidence = ({ item }: { item: any }) => (
        <View style={styles.evidenceCard}>
            <Text style={styles.evidenceDate}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.evidenceDesc}>{item.description}</Text>
            {item.fileUrl && (
                <TouchableOpacity onPress={() => setSelectedImage(item.fileUrl)}>
                    <Image source={{ uri: item.fileUrl }} style={styles.evidenceThumbnail} />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <Text style={styles.title}>Dispute Thread</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{dispute.status}</Text>
                </View>
                <Text style={styles.reasonTitle}>Reason:</Text>
                <Text style={styles.reasonText}>{dispute.reason}</Text>
                {dispute.resolution && (
                    <View style={styles.resolutionContainer}>
                        <Text style={styles.resolutionTitle}>Resolution:</Text>
                        <Text style={styles.resolutionText}>{dispute.resolution}</Text>
                    </View>
                )}
            </View>

            <Text style={styles.sectionTitle}>Evidence & Updates</Text>
            <FlatList
                data={evidence}
                keyExtractor={(item) => item.id}
                renderItem={renderEvidence}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>No evidence submitted.</Text>}
            />

            <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
    },
    headerCard: {
        backgroundColor: '#1E1E1E',
        padding: 20,
        marginBottom: 10,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#333',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        marginBottom: 15,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    reasonTitle: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 5,
    },
    reasonText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    resolutionContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    resolutionTitle: {
        color: '#4CD964',
        fontSize: 14,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    resolutionText: {
        color: '#fff',
        fontSize: 16,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 20,
        marginVertical: 15,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    evidenceCard: {
        backgroundColor: '#1E1E1E',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
    },
    evidenceDate: {
        color: '#888',
        fontSize: 12,
        marginBottom: 5,
    },
    evidenceDesc: {
        color: '#ddd',
        fontSize: 14,
        marginBottom: 10,
    },
    evidenceThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    emptyText: {
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
});
