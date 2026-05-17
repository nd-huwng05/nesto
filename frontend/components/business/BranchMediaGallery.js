import {useState, useMemo} from 'react';
import {Image, ScrollView, Text, TouchableOpacity, View} from 'react-native';

export function BranchMediaGallery({coverImage, images = []}) {
    const allImages = useMemo(() => {
        const list = [coverImage, ...images].filter(Boolean);
        return [...new Set(list)];
    }, [coverImage, images]);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const primaryUri = allImages[selectedIndex] || coverImage;

    if (!primaryUri && allImages.length === 0) {
        return (
            <View className="h-48 bg-gray-100 rounded-2xl items-center justify-center">
                <Text className="font-sf text-gray-400 text-sm">No images</Text>
            </View>
        );
    }

    return (
        <View>
            <Image
                source={{uri: primaryUri}}
                className="w-full h-52 rounded-2xl mb-3"
                resizeMode="cover"
            />
            {allImages.length > 1 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{gap: 8, paddingVertical: 4}}
                >
                    {allImages.map((uri, index) => (
                        <TouchableOpacity
                            key={`${uri}-${index}`}
                            onPress={() => setSelectedIndex(index)}
                            activeOpacity={0.85}
                        >
                            <Image
                                source={{uri}}
                                className={`w-20 h-16 rounded-xl border-2 ${
                                    selectedIndex === index ? 'border-primary' : 'border-transparent'
                                }`}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}
