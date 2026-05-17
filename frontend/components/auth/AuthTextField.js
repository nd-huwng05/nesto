import {Text, TextInput, View} from 'react-native';
import {Controller} from 'react-hook-form';
import {commonInputStyles} from '../../styles/TextInputStyles';

export function AuthTextField({
    control,
    name,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'none',
    autoFocus = false,
    editable = true,
    error,
    textContentType,
}) {
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
                            autoFocus={autoFocus}
                            autoCapitalize={autoCapitalize}
                            autoCorrect={false}
                            keyboardType={keyboardType}
                            textContentType={textContentType}
                            className="flex-1 font-sf-bold text-lg text-gray-900"
                            style={commonInputStyles.baseInput}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            editable={editable}
                        />
                    )}
                />
            </View>
            {error ? (
                <Text className="text-red-500 font-sf text-xs mt-1.5 px-1">{error}</Text>
            ) : null}
        </View>
    );
}
