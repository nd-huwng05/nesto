import {StyleSheet, Text, View} from 'react-native';
import {Star} from 'lucide-react-native';

export function CsatStars({score, compact = false, centered = false}) {
    const safe = Math.min(5, Math.max(0, Number(score) || 0));
    const fullStars = Math.floor(safe);
    const hasHalf = safe - fullStars >= 0.25 && safe - fullStars < 0.75;
    const roundUp = safe - fullStars >= 0.75;

    const filled = roundUp ? Math.min(5, fullStars + 1) : fullStars;
    const showHalf = hasHalf && !roundUp;

    const size = compact ? 13 : 15;

    return (
        <View style={[styles.row, centered && styles.centered]}>
            <View style={styles.stars}>
                {[0, 1, 2, 3, 4].map((i) => {
                    const isFull = i < filled;
                    const isHalf = showHalf && i === filled;
                    return (
                        <Star
                            key={i}
                            size={size}
                            color={isFull || isHalf ? '#f59e0b' : '#e2e8f0'}
                            fill={isFull ? '#f59e0b' : isHalf ? '#f59e0b' : 'transparent'}
                            style={styles.star}
                        />
                    );
                })}
            </View>
            <Text className={`font-sf-bold text-slate-800 ${compact ? 'text-base' : 'text-lg'}`}>
                {safe.toFixed(1)}
            </Text>
            <Text className="font-sf text-gray-400 text-xs ml-0.5">/5</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        maxWidth: '100%',
    },
    centered: {
        alignSelf: 'center',
        justifyContent: 'center',
    },
    stars: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 4,
    },
    star: {
        marginRight: 1,
    },
});
