import {TouchableOpacity, Text, Keyboard} from 'react-native';
import {AntDesign} from '@expo/vector-icons';

export function AuthAlternateButton({icon, label, onPress}) {
    return (
        <TouchableOpacity
            className="flex-row w-1/2 items-center bg-gray-100 px-2 py-1 rounded-full self-center mt-3"
            onPress={() => {
                Keyboard.dismiss();
                onPress();
            }}
        >
            <AntDesign name={icon} size={20} color="gray" style={icon === 'phone' ? {transform: [{rotate: '90deg'}]} : undefined} />
            <Text className="flex-1 font-bold ml-2 text-center text-gray-500 text-xs">{label}</Text>
        </TouchableOpacity>
    );
}
