import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Dealstash</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective Date: March 9, 2026</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Introduction</h2>
            <p>Dealstash ("we," "us," or "our"), operated by Jack Morgan, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our deal pipeline management platform. Please read this policy carefully. By using Dealstash, you consent to the practices described in this policy.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>

            <p className="font-medium text-gray-800 mb-1">Account Information</p>
            <p className="mb-3">When you create an account, we collect your name, email address, password (stored securely via hashing), and firm name. If you sign up via Google OAuth, we receive your name and email from Google.</p>

            <p className="font-medium text-gray-800 mb-1">Deal and Business Data</p>
            <p className="mb-3">All deal information you enter into Dealstash, including deal names, markets, financial data, notes, files, and decision logs. This data is entered voluntarily by you and belongs to your firm.</p>

            <p className="font-medium text-gray-800 mb-1">Usage Data</p>
            <p className="mb-3">We collect information about how you interact with the Service, including pages visited, features used, and actions taken. This is used to improve the Service and is collected via Vercel Analytics.</p>

            <p className="font-medium text-gray-800 mb-1">Payment Information</p>
            <p>Payment information (credit card details, billing address) is collected and processed directly by Stripe. We do not store your full payment card information. We receive confirmation of payment status and Stripe customer identifiers from Stripe.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process transactions and manage your subscription</li>
              <li>Send you account-related notifications and updates</li>
              <li>Respond to your support requests and inquiries</li>
              <li>Monitor and analyze usage patterns to improve the Service</li>
              <li>Detect and prevent fraudulent or unauthorized activity</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3">We do not sell your personal information or use your deal data for any purpose other than providing the Service to you.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Data Storage</h2>
            <p>Your data is stored using <strong>Supabase</strong>, a managed database platform hosted on AWS infrastructure in the United States. All data is encrypted in transit using TLS and encrypted at rest. We implement reasonable technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.</p>
            <p className="mt-3">File uploads (such as Offering Memorandums) are stored in Supabase Storage, also hosted on US servers with access controlled by Row Level Security policies that ensure only members of your firm can access your firm's files.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Data Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following limited circumstances:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Service Providers:</strong> We share data with infrastructure providers (Supabase, Vercel, Stripe) solely to operate the Service. These providers are contractually bound to protect your data.</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, legal process, or governmental request.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction with notice to you.</li>
              <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Cookies</h2>
            <p>Dealstash uses cookies and similar tracking technologies to maintain your authentication session and improve your experience. Specifically:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Authentication cookies:</strong> Used by Supabase to maintain your login session. Required for the Service to function.</li>
              <li><strong>Analytics:</strong> Vercel Analytics collects anonymized usage data. No personally identifiable information is stored in analytics cookies.</li>
            </ul>
            <p className="mt-3">You can configure your browser to refuse cookies, but this may affect your ability to use the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Your Rights</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Access:</strong> You may request a copy of the personal information we hold about you.</li>
              <li><strong>Correction:</strong> You may request correction of inaccurate information.</li>
              <li><strong>Deletion:</strong> You may request deletion of your account and associated data.</li>
              <li><strong>Portability:</strong> You may request an export of your deal data in a standard format.</li>
              <li><strong>Opt-out:</strong> You may opt out of non-essential communications at any time.</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:jack@getdealstash.com" className="text-blue-600 hover:underline">jack@getdealstash.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you cancel your subscription, we retain your data for 30 days to allow for reactivation, after which it may be permanently deleted. You may request immediate deletion by contacting us. Anonymized, aggregated usage data may be retained indefinitely for product improvement purposes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Children's Privacy</h2>
            <p>Dealstash is not directed at children under the age of 18. We do not knowingly collect personal information from children under 18. If you believe we have inadvertently collected such information, please contact us immediately and we will take steps to delete it.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice within the Service. Your continued use of the Service after changes take effect constitutes your acceptance of the revised policy. We encourage you to review this policy periodically.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Contact</h2>
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <div className="mt-2">
              <p><strong>Jack Morgan</strong></p>
              <p>Dealstash</p>
              <p>Missouri, United States</p>
              <p>Email: <a href="mailto:jack@getdealstash.com" className="text-blue-600 hover:underline">jack@getdealstash.com</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Dealstash</Link>
        </div>
      </div>
    </div>
  )
}
