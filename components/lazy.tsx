'use client'

// With a single catch-all route, every client component imported from any MDX
// page lands in the shared chunks. Heavy, page-specific components are loaded
// through next/dynamic here so they become async chunks fetched only by the
// pages that render them.

import dynamic from 'next/dynamic'

export const AffiliationForm = dynamic(() => import('@/components/affiliation-form'))
export const AssetInspector = dynamic(() => import('@/components/assets').then((m) => m.AssetInspector))
export const AssetUploader = dynamic(() => import('@/components/assets').then((m) => m.AssetUploader))
export const OnboardingForm = dynamic(() => import('@/components/onboarding-form'))
export const ProfileEditor = dynamic(() => import('@/components/profile-editor').then((m) => m.ProfileEditor))
