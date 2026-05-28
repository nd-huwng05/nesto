import {Alert, Image, Text, TouchableOpacity, View} from 'react-native';
import {ImagePlus, X} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {getImagePickerMediaTypes} from '../../utils/mediaUrl';

const MAX_IMAGES = 8;

export function MultiImagePicker({images = [], onChange, label = 'Add photos of facade, lobby, and surroundings'}) {
    const pickImage = async () => {
        if (images.length >= MAX_IMAGES) {
            Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images.`);
            return;
        }
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission Denied', 'Allow photo library access to upload images.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: getImagePickerMediaTypes(ImagePicker),
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.[0]?.uri) {
                onChange([...images, result.assets[0].uri]);
            }
        } catch {
            Alert.alert('Error', 'Could not open photo library.');
        }
    };

    const removeAt = (index) => {
        onChange(images.filter((_, i) => i !== index));
    };

    return (
        <View>
            <Text className="font-sf text-gray-500 text-xs text-center mb-3 px-2">{label}</Text>
            <View className="flex-row flex-wrap gap-2 justify-center">
                {images.map((uri, index) => (
                    <View key={`${uri}-${index}`} className="relative">
                        <Image source={{uri}} className="w-24 h-24 rounded-xl" resizeMode="cover" />
                        <TouchableOpacity
                            onPress={() => removeAt(index)}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                        >
                            <X size={14} color="#fff" />
                        </TouchableOpacity>
                        {index === 0 && (
                            <View className="absolute bottom-1 left-1 bg-black/50 px-1.5 py-0.5 rounded">
                                <Text className="text-white text-[10px] font-sf-semi">Cover</Text>
                            </View>
                        )}
                    </View>
                ))}
                {images.length < MAX_IMAGES && (
                    <TouchableOpacity
                        onPress={pickImage}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center"
                    >
                        <ImagePlus size={24} color="#94a3b8" />
                        <Text className="text-[10px] text-gray-400 font-sf mt-1">Add</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
