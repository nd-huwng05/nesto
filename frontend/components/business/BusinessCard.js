import {View, Text, Image, TouchableOpacity, Animated} from 'react-native';
import {ChevronRight, Plus} from 'lucide-react-native';
import {useAccordionAnimation} from '../../hooks/animations/useAccordionAnimation';

export default function BusinessCard({
    business,
    onAddBranch,
    onBranchPress,
    onBusinessPress,
}) {
    const {toggleOpen, rotateArrow, contentHeight, contentOpacity, handleLayout} =
        useAccordionAnimation(200);

    return (
        <View className="bg-[#4e5d6c] rounded-2xl shadow-sm mb-4">
            <View className="flex-row items-center bg-white py-3 px-3 rounded-2xl z-20">
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => onBusinessPress?.(business)}
                    className="flex-1 flex-row items-center"
                >
                    <Image source={{uri: business.logo}} className="w-12 h-12 rounded-full" />
                    <View className="px-3 flex-1">
                        <Text className="text-xl font-bold text-slate-800">{business.name}</Text>
                        <Text className="text-sm text-gray-400 font-medium">
                            {business.branches.length} Branch
                            {business.branches.length !== 1 ? 'es' : ''}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={toggleOpen}
                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    accessibilityRole="button"
                    accessibilityLabel="Expand branches"
                >
                    <Animated.View style={{transform: [{rotate: rotateArrow}]}}>
                        <ChevronRight size={20} color="#1e293b" />
                    </Animated.View>
                </TouchableOpacity>
            </View>

            <Animated.View
                style={{height: contentHeight, opacity: contentOpacity}}
                className="bg-[#4e5d6c] px-4 overflow-hidden rounded-b-2xl"
            >
                <View onLayout={handleLayout} className="pt-3 gap-3 z-0">
                    {business.branches.map((branch) => (
                        <TouchableOpacity
                            key={branch.id}
                            onPress={() => onBranchPress?.(branch, business.id)}
                            className="flex-row justify-between items-center bg-white/10 p-3 rounded-xl"
                        >
                            <View className="flex-row items-center flex-1 pr-2">
                                <Image source={{uri: branch.image}} className="w-10 h-10 rounded-full" />
                                <View className="px-3 flex-1">
                                    <Text className="text-base font-bold text-white">{branch.name}</Text>
                                    <Text className="text-xs text-gray-300" numberOfLines={1}>
                                        {branch.address}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        onPress={() => onAddBranch?.(business.id)}
                        className="flex-row items-center justify-center border border-gray-300/40 rounded-xl py-2.5 mb-2 border-dashed"
                    >
                        <Plus size={18} color="#ffffff" />
                        <Text className="text-white font-semibold text-sm ml-2">Add branch</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}
