import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { colors } from '@/lib/theme'

interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
}

export default function ProfileSettings() {
  const { user, signOut } = useAuthContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', phone: '' })

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,phone,email')
      .eq('id', user!.id)
      .maybeSingle()

    if (!error && data) {
      setProfile(data as Profile)
      setFormData({ fullName: data.full_name || '', phone: data.phone || '' })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: formData.fullName, phone: formData.phone })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      Alert.alert('Error', 'Failed to save profile')
    } else {
      setProfile({ ...profile!, full_name: formData.fullName, phone: formData.phone })
      setEditing(false)
      Alert.alert('Success', 'Profile updated')
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Profile Settings</Text>
            <Text style={s.sub}>Manage your account information</Text>
          </View>
        </View>

        {/* Profile Card */}
        <Card style={s.profileCard}>
          <View style={s.avatarBox}>
            <Ionicons name="person-circle-outline" size={64} color={colors.gold} />
          </View>
          <Text style={s.email}>{profile?.email}</Text>
        </Card>

        {/* Edit Mode */}
        {editing ? (
          <Card style={s.formCard}>
            <Text style={s.formTitle}>Edit Profile</Text>

            <View style={s.formGroup}>
              <Text style={s.label}>Full Name</Text>
              <TextInput
                style={s.input}
                placeholder="Your name"
                placeholderTextColor={colors.slate500}
                value={formData.fullName}
                onChangeText={v => setFormData({ ...formData, fullName: v })}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Phone</Text>
              <TextInput
                style={s.input}
                placeholder="Phone number"
                placeholderTextColor={colors.slate500}
                value={formData.phone}
                onChangeText={v => setFormData({ ...formData, phone: v })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={s.actions}>
              <Button title="Save" onPress={handleSave} loading={saving} />
              <Button title="Cancel" onPress={() => setEditing(false)} variant="outline" />
            </View>
          </Card>
        ) : (
          <Card style={s.infoCard}>
            <Text style={s.infoTitle}>Account Information</Text>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Full Name</Text>
              <Text style={s.infoValue}>{profile?.full_name || 'Not set'}</Text>
            </View>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{profile?.email}</Text>
            </View>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Phone</Text>
              <Text style={s.infoValue}>{profile?.phone || 'Not set'}</Text>
            </View>

            <Button title="Edit Profile" onPress={() => setEditing(true)} />
          </Card>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.navy },
  container: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { color: colors.white, fontSize: 24, fontWeight: 'bold' },
  sub: { color: colors.slate400, fontSize: 14, marginTop: 4 },
  profileCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  avatarBox: { marginBottom: 12 },
  email: { color: colors.slate300, fontSize: 14 },
  formCard: { marginBottom: 16, padding: 16 },
  formTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.navyLight, color: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.slate700, fontSize: 15 },
  actions: { gap: 8, marginTop: 16 },
  infoCard: { marginBottom: 16 },
  infoTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  infoRow: { marginBottom: 14 },
  infoLabel: { color: colors.slate400, fontSize: 12 },
  infoValue: { color: colors.white, fontSize: 14, marginTop: 4, fontWeight: '500' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 24 },
  signOutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
})
