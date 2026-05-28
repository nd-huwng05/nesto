import React from 'react';
import {Alert, ScrollView, Text, TouchableOpacity, View} from 'react-native';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error) {
        return {hasError: true, error};
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary] render error', error, info);
    }

    handleReset = () => {
        this.setState({hasError: false, error: null});
        this.props?.onReset?.();
    };

    handleShowDetails = () => {
        const message = this.state?.error?.message || 'Unknown error';
        Alert.alert('Something went wrong', message);
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={{flex: 1, backgroundColor: '#f3f4f6', padding: 20}}>
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                    }}
                >
                    <Text style={{fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8}}>
                        App crashed
                    </Text>
                    <Text style={{color: '#6b7280', marginBottom: 12}}>
                        We hit an unexpected error. You can try reloading this screen.
                    </Text>

                    <ScrollView style={{maxHeight: 140, marginBottom: 12}}>
                        <Text style={{color: '#94a3b8', fontSize: 12}}>
                            {String(this.state?.error?.message || this.state?.error || 'Unknown error')}
                        </Text>
                    </ScrollView>

                    <View style={{flexDirection: 'row', gap: 10}}>
                        <TouchableOpacity
                            onPress={this.handleReset}
                            style={{
                                flex: 1,
                                backgroundColor: '#8294FF',
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            activeOpacity={0.9}
                        >
                            <Text style={{color: 'white', fontWeight: '700'}}>Reload</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={this.handleShowDetails}
                            style={{
                                flex: 1,
                                backgroundColor: '#f1f5f9',
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                            }}
                            activeOpacity={0.9}
                        >
                            <Text style={{color: '#334155', fontWeight: '700'}}>Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }
}

