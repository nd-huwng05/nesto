import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {REPORT_SECTION_GAP} from './reportLayout';
import {reportChipStyles as styles} from './reportChipStyles';

export function ReportBranchFilter({options, selectedId, onSelect}) {
    return (
        <View style={{width: '100%', marginBottom: REPORT_SECTION_GAP}}>
            <Text className="font-sf text-xs text-gray-500 mb-2 uppercase tracking-wide">Branch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {options.map((option) => {
                    const active = option.id === selectedId;
                    return (
                        <TouchableOpacity
                            key={option.id}
                            onPress={() => onSelect(option.id)}
                            activeOpacity={0.8}
                            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                        >
                            <Text
                                style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}
                                numberOfLines={1}
                            >
                                {option.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}
