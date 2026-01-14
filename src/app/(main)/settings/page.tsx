'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { useUser } from '@/store/auth-store';

interface Preferences {
  theme: string;
  language: string;
  autoplayNext: boolean;
  autoplayPreviews: boolean;
  defaultQuality: string;
  subtitleLang: string;
  maturityLevel: string;
  hasTorboxKey: boolean;
}

export default function SettingsPage() {
  const user = useUser();
  const { theme, setTheme } = useTheme();

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [torboxKey, setTorboxKey] = useState('');
  const [showTorboxKey, setShowTorboxKey] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/preferences');
        const data = await response.json();
        setPreferences(data.data);
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreferences();
  }, []);

  const updatePreference = async (key: string, value: unknown) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }

      if (preferences) {
        setPreferences({ ...preferences, [key]: value });
      }

      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const saveTorboxKey = async () => {
    await updatePreference('torboxApiKey', torboxKey);
    setTorboxKey('');
    if (preferences) {
      setPreferences({ ...preferences, hasTorboxKey: !!torboxKey });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <PageHeader
          title="Settings"
          description="Manage your account and preferences"
        />

        <div className="space-y-6">
          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={user?.displayName || ''} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Watchers looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Watch Together */}
          <Card>
            <CardHeader>
              <CardTitle>Watch Together</CardTitle>
              <CardDescription>Settings for watch parties with friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nickname</Label>
                <p className="text-xs text-muted-foreground">
                  Your nickname is shown to others in watch parties
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a nickname..."
                    defaultValue={user?.nickname || ''}
                    maxLength={20}
                    onBlur={async (e) => {
                      const value = e.target.value.trim();
                      if (value !== (user?.nickname || '')) {
                        setIsSaving(true);
                        try {
                          const res = await fetch('/api/user/profile', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nickname: value || null }),
                          });
                          if (res.ok) {
                            toast.success('Nickname updated');
                          } else {
                            toast.error('Failed to update nickname');
                          }
                        } catch {
                          toast.error('Failed to update nickname');
                        } finally {
                          setIsSaving(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Playback */}
          <Card>
            <CardHeader>
              <CardTitle>Playback</CardTitle>
              <CardDescription>Video playback preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Quality</Label>
                <Select
                  value={preferences?.defaultQuality || 'auto'}
                  onValueChange={(value) => updatePreference('defaultQuality', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="480p">480p</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subtitle Language</Label>
                <Select
                  value={preferences?.subtitleLang || 'en'}
                  onValueChange={(value) => updatePreference('subtitleLang', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* TorBox Integration */}
          <Card>
            <CardHeader>
              <CardTitle>TorBox Integration</CardTitle>
              <CardDescription>
                Connect your TorBox account for universal playback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showTorboxKey ? 'text' : 'password'}
                      placeholder={preferences?.hasTorboxKey ? '••••••••••••••••' : 'Enter your TorBox API key'}
                      value={torboxKey}
                      onChange={(e) => setTorboxKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowTorboxKey(!showTorboxKey)}
                    >
                      {showTorboxKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button onClick={saveTorboxKey} disabled={!torboxKey || isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://torbox.app/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    torbox.app/settings
                  </a>
                </p>
              </div>

              {preferences?.hasTorboxKey && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  TorBox API key configured
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">Delete Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
