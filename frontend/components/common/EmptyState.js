import {StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

export default function EmptyState({icon = 'heart-dislike-outline', title, subtitle}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color="#111827" />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {paddingVertical: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center'},
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {fontFamily: 'SF-Bold', fontSize: 16, color: '#111827', textAlign: 'center'},
  subtitle: {marginTop: 6, fontFamily: 'SF-Regular', fontSize: 13, color: '#6b7280', textAlign: 'center'},
});
