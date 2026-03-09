import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Dealstash</Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Effective Date: March 9, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Dealstash ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms constitute a legally binding agreement between you and Jack Morgan ("we," "us," or "our"), the operator of Dealstash.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Description of Service</h2>
            <p>Dealstash is a deal pipeline management platform designed for investment teams. The Service allows users to track deals, log decisions, manage team members, upload documents, capture financial data, and maintain institutional knowledge about investment opportunities.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old and have the legal capacity to enter into a binding agreement to use the Service. By using Dealstash, you represent and warrant that you meet these requirements. The Service is intended for business use by investment professionals and teams.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Account Registration</h2>
            <p>To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account at jack@getdealstash.com. Each workspace is associated with a single firm, and all team members within a firm share access to that firm's data.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Subscription and Payment</h2>
            <p>Dealstash is offered on a subscription basis at <strong>$99 per month per firm</strong>, billed monthly. Payments are processed securely through Stripe. By subscribing, you authorize us to charge your payment method on a recurring monthly basis until you cancel. All fees are non-refundable except as required by applicable law. We reserve the right to change pricing with 30 days' notice to subscribers.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Free Trial</h2>
            <p>We may offer a free trial period at our discretion. During the free trial, you have access to all features of the Service. At the end of the trial period, you will be required to subscribe to continue using the Service. We reserve the right to modify or terminate free trial offers at any time.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Acceptable Use</h2>
            <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Upload or transmit any malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to store or transmit material that infringes third-party intellectual property rights</li>
              <li>Resell or sublicense access to the Service without our written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Data and Content</h2>
            <p>You retain ownership of all data and content you upload or create within the Service ("Your Content"). By using the Service, you grant us a limited, non-exclusive license to store, process, and display Your Content solely to provide the Service to you. You are solely responsible for the accuracy, legality, and appropriateness of Your Content. We do not claim ownership of Your Content and will not use it for any purpose other than providing the Service.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Confidentiality</h2>
            <p>We understand that your deal data is highly sensitive. We treat all data you store in Dealstash as confidential. We will not share, sell, or disclose your deal data, firm information, or any proprietary information to third parties except as required to provide the Service (e.g., infrastructure providers) or as required by law. Our team members who may access your data for support purposes are bound by confidentiality obligations.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Jack Morgan and Dealstash. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent. Nothing in these Terms transfers any intellectual property rights to you.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">12. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL JACK MORGAN OR DEALSTASH BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">13. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Jack Morgan, Dealstash, and their respective officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in connection with your use of the Service, your violation of these Terms, or your violation of any rights of a third party.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">14. Termination</h2>
            <p>You may cancel your subscription and terminate your account at any time by contacting us at jack@getdealstash.com. We may terminate or suspend your account immediately, without prior notice, for conduct that we reasonably believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination, after which it may be permanently deleted.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">15. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Missouri, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Missouri, and you consent to the personal jurisdiction of such courts.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">16. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes by email or by posting a notice within the Service. Your continued use of the Service after such changes constitutes your acceptance of the new Terms. We encourage you to review these Terms periodically.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">17. Contact</h2>
            <p>If you have any questions about these Terms of Service, please contact us:</p>
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
