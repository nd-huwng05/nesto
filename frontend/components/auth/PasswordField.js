import {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {Controller} from 'react-hook-form';
import {Eye, EyeOff} from 'lucide-react-native';
import {commonInputStyles} from '../../styles/TextInputStyles';

export function PasswordField({
    control,
    name = 'password',
    placeholder = 'Password',
    autoFocus = false,
    editable = true,
    error,
    hint,
    textContentType = 'password',
}) {
    const [visible, setVisible] = useState(false);
    const borderClass = error ? 'border-red-400' : 'border-gray-100';

    return (
        <View className="mb-1">
            <View className={`flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 ${borderClass}`}>
                <Controller
                    control={control}
                    name={name}
                    render={({field: {onChange, onBlur, value}}) => (
                        <TextInput
                            placeholder={placeholder}
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!visible}
                            autoFocus={autoFocus}
                            textContentType={textContentType}
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="flex-1 font-sf-bold text-lg text-gray-900"
                            style={commonInputStyles.baseInput}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            editable={editable}
                        />
                    )}
                />
                <TouchableOpacity
                    onPress={() => setVisible((v) => !v)}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    accessibilityRole="button"
                    accessibilityLabel={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? (
                        <EyeOff size={20} color="#6b7280" />
                    ) : (
                        <Eye size={20} color="#6b7280" />
                    )}
                </TouchableOpacity>
            </View>
            {error ? (
                <Text className="text-red-500 font-sf text-xs mt-1.5 px-1">{error}</Text>
            ) : hint ? (
                <Text className="text-gray-500 font-sf text-xs mt-2 px-1">{hint}</Text>
            ) : null}
        </View>
    );
}
