import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useMutation, useQuery } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import { feedbackAPI, parkingLotAPI } from '../../services/api'
import { Button, Card, Input, ScreenHeader } from '../../components/common'
import { COLORS, SIZES, SHADOWS } from '../../utils/theme'

const FEEDBACK_TYPES = [
  { key: 'general',      label: 'Chung',      icon: 'chatbubble-outline' },
  { key: 'complaint',    label: 'Khiếu nại',  icon: 'alert-circle-outline' },
  { key: 'suggestion',   label: 'Đề xuất',    icon: 'bulb-outline' },
  { key: 'compliment',   label: 'Khen ngợi',  icon: 'heart-outline' },
  { key: 'issue_report', label: 'Báo lỗi',    icon: 'bug-outline' },
]

export default function FeedbackScreen({ navigation }) {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  const [form, setForm] = useState({ parkingLot: '', type: 'general', rating: 5, title: '', content: '' })

  const { data: lots } = useQuery({
    queryKey: ['lots-feedback'],
    queryFn: () => parkingLotAPI.getAll({ limit: 50 }).then(r => r.data.data),
  })

  const submitMut = useMutation({
    mutationFn: () => feedbackAPI.create(form),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: '🎉 Gửi phản hồi thành công!', text2: 'Cảm ơn bạn đã đóng góp ý kiến' })
      navigation?.goBack()
    },
    onError: err => Toast.show({ type: 'error', text1: err.response?.data?.message || 'Gửi phản hồi thất bại' }),
  })

  const handleSubmit = () => {
    if (!form.parkingLot) { Toast.show({ type: 'error', text1: 'Vui lòng chọn bãi xe' }); return }
    if (!form.title.trim()) { Toast.show({ type: 'error', text1: 'Vui lòng nhập tiêu đề' }); return }
    if (!form.content.trim()) { Toast.show({ type: 'error', text1: 'Vui lòng nhập nội dung' }); return }
    submitMut.mutate()
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? COLORS.dark.bg : COLORS.bg }}>
      <ScreenHeader title="Gửi phản hồi" onBack={() => navigation?.goBack()} />
      <ScrollView contentContainerStyle={{ padding: SIZES.screenPadding, paddingBottom: 120, gap: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Parking lot select */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 8 }}>Bãi xe *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {lots?.map(lot => (
              <TouchableOpacity key={lot._id} onPress={() => setForm({ ...form, parkingLot: lot._id })} activeOpacity={0.8}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: form.parkingLot === lot._id ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), backgroundColor: form.parkingLot === lot._id ? COLORS.primaryBg : (dark ? COLORS.dark.bgSecondary : '#f8fafc') }}>
                  <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: form.parkingLot === lot._id ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>{lot.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Feedback type */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 8 }}>Loại phản hồi</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FEEDBACK_TYPES.map(t => (
              <TouchableOpacity key={t.key} onPress={() => setForm({ ...form, type: t.key })} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: form.type === t.key ? COLORS.primary : (dark ? COLORS.dark.border : COLORS.border), backgroundColor: form.type === t.key ? COLORS.primaryBg : (dark ? COLORS.dark.bgSecondary : '#f8fafc') }}>
                  <Ionicons name={t.icon} size={14} color={form.type === t.key ? COLORS.primary : COLORS.textTertiary} />
                  <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: form.type === t.key ? COLORS.primary : (dark ? COLORS.dark.text : COLORS.text) }}>{t.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Rating stars */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={{ fontSize: SIZES.fontSm, fontWeight: '600', color: dark ? COLORS.dark.textSecondary : COLORS.textSecondary, marginBottom: 8 }}>Đánh giá</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setForm({ ...form, rating: star })}>
                <Ionicons name={star <= form.rating ? 'star' : 'star-outline'} size={36} color={star <= form.rating ? '#f59e0b' : COLORS.textTertiary} />
              </TouchableOpacity>
            ))}
            <Text style={{ marginLeft: 8, fontSize: SIZES.fontMd, color: '#f59e0b', fontWeight: '700', alignSelf: 'center' }}>{form.rating}/5</Text>
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Input label="Tiêu đề *" value={form.title} onChangeText={v => setForm({ ...form, title: v })} placeholder="Nhập tiêu đề phản hồi..." icon="create-outline" />
        </Animated.View>

        {/* Content */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Input label="Nội dung *" value={form.content} onChangeText={v => setForm({ ...form, content: v })} placeholder="Mô tả chi tiết ý kiến của bạn..." multiline numberOfLines={5} icon="document-text-outline" />
        </Animated.View>

        {/* Tip */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <Card style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
              <Text style={{ flex: 1, fontSize: SIZES.fontSm, color: '#92400e', lineHeight: 20 }}>Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ. Hãy mô tả chi tiết để được hỗ trợ tốt nhất.</Text>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Submit */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: SIZES.screenPadding, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: dark ? COLORS.dark.bg : COLORS.white, borderTopWidth: 1, borderTopColor: dark ? COLORS.dark.border : COLORS.border, ...SHADOWS.md }}>
        <Button title="Gửi phản hồi" onPress={handleSubmit} loading={submitMut.isPending} size="lg" icon="send-outline" />
      </View>
    </View>
  )
}
