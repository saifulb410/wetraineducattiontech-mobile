import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, StyleSheet, Image, ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
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
  avatar_url: string | null
}

export default function ProfileSettings() {
  const { user, signOut } = useAuthContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', phone: '' })

  const authEmail = user?.email ?? ''
  const displayName = profile?.full_name || user?.user_metadata?.full_name || ''
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : authEmail.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,phone,email,avatar_url')
      .eq('id', user!.id)
      .maybeSingle()

    if (data) {
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
      .update({ full_name: formData.fullName.trim(), phone: formData.phone.trim() })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      Alert.alert('Error', 'Failed to save profile')
    } else {
      setProfile(p => ({ ...p!, full_name: formData.fullName.trim(), phone: formData.phone.trim() }))
      setEditing(false)
      Alert.alert('Saved', 'Profile updated successfully')
    }
  }

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })

    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setUploadingPhoto(true)

    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg'
      const path = `${user!.id}/avatar.${ext}`

      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = urlData.publicUrl + '?t=' + Date.now()

      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user!.id)
      setProfile(p => ({ ...p!, avatar_url: avatarUrl }))
    } catch (err: any) {
      Alert.alert('Upload failed', 'Make sure an "avatars" bucket exists in Supabase Storage (public).')
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <ScrollView style={s.scroll}>
      <View style={s.container}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} style={s.avatarWrap} disabled={uploadingPhoto}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarInitials}>
                <Text style={s.initialsText}>{initials}</Text>
              </View>
            )}
            <View style={s.avatarEdit}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={colors.navy} />
                : <Ionicons name="camera" size={14} color={colors.navy} />
              }
            </View>
          </TouchableOpacity>

          <Text style={s.avatarName}>{displayName || 'No name set'}</Text>
          <Text style={s.avatarEmail}>{authEmail}</Text>
          <Text style={s.avatarHint}>Tap photo to change</Text>
        </View>

        {/* Account Info / Edit Form */}
        {editing ? (
          <Card style={s.formCard}>
            <Text style={s.formTitle}>Edit Profile</Text>

            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={s.input}
              placeholder="Your full name"
              placeholderTextColor={colors.slate500}
              value={formData.fullName}
              onChangeText={v => setFormData({ ...formData, fullName: v })}
            />

            <Text style={s.label}>Phone Number</Text>
            <TextInput
              style={s.input}
              placeholder="+880 ..."
              placeholderTextColor={colors.slate500}
              value={formData.phone}
              onChangeText={v => setFormData({ ...formData, phone: v })}
              keyboardType="phone-pad"
            />

            <Text style={s.emailNote}>
              <Ionicons name="information-circle-outline" size={13} color={colors.slate500} />
              {'  '}Email address is managed by your account and cannot be changed here.
            </Text>

            <View style={s.actions}>
              <Button title="Save Changes" onPress={handleSave} loading={saving} />
              <Button title="Cancel" onPress={() => setEditing(false)} variant="outline" />
            </View>
          </Card>
        ) : (
          <Card style={s.infoCard}>
            <Text style={s.infoTitle}>Account Information</Text>

            <View style={s.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.gold} />
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Full Name</Text>
                <Text style={s.infoValue}>{displayName || 'Not set — tap Edit to add'}</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <Ionicons name="mail-outline" size={16} color={colors.gold} />
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{authEmail}</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <Ionicons name="call-outline" size={16} color={colors.gold} />
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Phone</Text>
                <Text style={s.infoValue}>{profile?.phone || 'Not set'}</Text>
              </View>
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

  avatarSection: { alignItems: 'center', paddingVertical: 28, marginBottom: 16 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.gold },
  avatarInitials: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.gold + '22', borderWidth: 3, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  initialsText: { color: colors.gold, fontSize: 32, fontWeight: '800' },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.navy,
  },
  avatarName: { color: colors.white, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  avatarEmail: { color: colors.slate400, fontSize: 14, marginBottom: 4 },
  avatarHint: { color: colors.slate500, fontSize: 11 },

  formCard: { marginBottom: 16 },
  formTitle: { color: colors.white, fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  label: { color: colors.slate300, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.navyLight, color: colors.white, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1,
    borderColor: colors.slate700, fontSize: 15, marginBottom: 16,
  },
  emailNote: { color: colors.slate500, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  actions: { gap: 8 },

  infoCard: { marginBottom: 16 },
  infoTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.slate700 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  infoContent: { flex: 1 },
  infoLabel: { color: colors.slate400, fontSize: 12 },
  infoValue: { color: colors.white, fontSize: 14, marginTop: 2, fontWeight: '500' },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 8 },
  signOutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
})
