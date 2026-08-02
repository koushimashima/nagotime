// src/features/about/AboutPage.tsx
// NagoTime コンセプト・サービス内容ページ
// ロゴタップ時に表示される。認証不要。

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Star, Ticket, Users, Compass, MessageSquare } from 'lucide-react'

// ---- サービス機能カード ----

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100 flex gap-4">
      <div className="shrink-0 w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ---- メインコンポーネント ----

export function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---- ヘッダー ---- */}
      <div className="bg-orange-500 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="戻る"
            className="p-2 rounded-full text-orange-100 hover:text-white hover:bg-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-lg font-semibold text-white">NagoTimeについて</span>
          <div className="ml-auto">
            <a
              href="https://forms.gle/iRgnT9q3EhVXmBKM7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         text-sm font-medium text-orange-500 bg-white
                         hover:bg-orange-50 transition-colors"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              フィードバック
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* ---- ロゴ + キャッチコピー ---- */}
        <section className="text-center py-6">
          <h1
            className="text-6xl font-bold text-orange-500 mb-3"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            NagoTime
          </h1>
          <p className="text-base font-medium text-gray-700 leading-relaxed">
            学生の、学生による、<br />学生と地域のためのローカルガイド
          </p>
        </section>

        {/* ---- コンセプト ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" aria-hidden="true" />
            コンセプト
          </h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              学生たちが、名古屋（Nago）での「ちょうどいい時間（Time）」を
              シェアし合うローカルクチコミアプリです。
            </p>
            <p>
              今いる場所・天気・時間帯に合わせてリアルタイムに最適なスポットを提案し、
              学生目線のリアルな情報を地域と学生コミュニティへ還元します。
            </p>
            <p>
              口コミを投稿するたびに<span className="font-semibold text-orange-500">マイル</span>が貯まり、
              地域施設や協賛店舗で使えるチケットと交換できるエコシステムで、
              学生・店舗・地域がともに盛り上がる仕組みを目指しています。
            </p>
          </div>
        </section>

        {/* ---- できること（機能一覧） ---- */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" aria-hidden="true" />
            できること
          </h2>
          <div className="space-y-3">
            <FeatureCard
              icon={<Compass className="w-5 h-5" />}
              title="コンテキスト対応フィード"
              description="現在地・天気・時間帯を自動取得し、今この瞬間に合ったスポットのクチコミをフィードに表示します。"
            />
            <FeatureCard
              icon={<MapPin className="w-5 h-5" />}
              title="マップビュー"
              description="フィードに表示中のスポットを地図上で確認。位置感覚をつかみながらお出かけ先を選べます。"
            />
            <FeatureCard
              icon={<Star className="w-5 h-5" />}
              title="クチコミ投稿"
              description="写真・テキスト・ハッシュタグでスポットへの感想を投稿。学生のリアルな声を地域全体で共有します。"
            />
            <FeatureCard
              icon={<Ticket className="w-5 h-5" />}
              title="マイル＆クーポン"
              description="クチコミを投稿するとマイルが貯まります。貯めたマイルは地域の商業・文化施設のチケットに交換できます。"
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="学生コミュニティ"
              description="学生が中心となって情報を発信・共有。リアルで信頼度の高いローカル情報が集まります。"
            />
          </div>
        </section>

        {/* ---- フッター ---- */}
        <footer className="text-center text-xs text-gray-400 pb-4">
          © 2026 NagoTime — All rights reserved.<br />
          Created by Koushi HIGASHIURA & Kiro
        </footer>

      </div>
    </div>
  )
}
