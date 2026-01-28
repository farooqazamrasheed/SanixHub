import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Image from 'next/image';
import Link from 'next/link';
import Layout from '@/components/Layout';
import BackButton from '@/components/BackButton';

export default function AboutPage() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <NextSeo
        title="About Us - SanixHub"
        description="Learn about SanixHub - Your trusted partner for quality sanitary and plumbing products in Pakistan"
      />

      {/* Back Button */}
      <div className="container mx-auto px-4 pt-6">
        <BackButton href="/" label="Back to Home" variant="ghost" />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4 text-center">About SanixHub</h1>
          <p className="text-xl text-center max-w-3xl mx-auto">
            Your trusted partner for quality sanitary and plumbing products in Pakistan
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p>
                SanixHub was founded with a simple mission: to make quality sanitary and plumbing 
                products accessible to everyone in Pakistan. We understand that building or renovating 
                a home is a significant investment, and choosing the right fixtures and fittings is 
                crucial for both functionality and aesthetics.
              </p>
              <p>
                What started as a small retail store has grown into a comprehensive online platform 
                serving customers across Pakistan. We pride ourselves on offering an extensive range 
                of products from trusted brands, competitive pricing, and exceptional customer service.
              </p>
              <p>
                Today, SanixHub is recognized as one of Pakistan's leading suppliers of sanitary 
                and plumbing products, serving homeowners, contractors, and businesses alike.
              </p>
            </div>
          </section>

          {/* Our Mission */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <div className="bg-primary-50 rounded-lg p-6 border-l-4 border-primary-600">
              <p className="text-lg text-gray-700">
                To provide high-quality sanitary and plumbing products at competitive prices, 
                backed by excellent customer service and expert advice. We strive to make home 
                improvement accessible, affordable, and hassle-free for all our customers.
              </p>
            </div>
          </section>

          {/* Our Values */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Quality First</h3>
                </div>
                <p className="text-gray-600">
                  We only source products from reputable manufacturers and conduct thorough 
                  quality checks to ensure durability and performance.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Fair Pricing</h3>
                </div>
                <p className="text-gray-600">
                  Competitive prices without compromising on quality. We believe premium products 
                  should be accessible to all.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Customer Focus</h3>
                </div>
                <p className="text-gray-600">
                  Your satisfaction is our priority. We provide expert advice, easy returns, 
                  and responsive customer support.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Fast Delivery</h3>
                </div>
                <p className="text-gray-600">
                  Quick and reliable delivery across Pakistan. We understand time is valuable 
                  in construction and renovation projects.
                </p>
              </div>
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Why Choose SanixHub?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Extensive Product Range</h4>
                  <p className="text-gray-600">
                    From basic faucets to premium bathroom suites, we have everything you need 
                    under one roof.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Trusted Brands</h4>
                  <p className="text-gray-600">
                    We partner with leading international and local manufacturers known for 
                    quality and reliability.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Expert Support</h4>
                  <p className="text-gray-600">
                    Our knowledgeable team is always ready to help you choose the right products 
                    for your specific needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Secure Shopping</h4>
                  <p className="text-gray-600">
                    Safe and secure online transactions with multiple payment options for your 
                    convenience.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Warranty & Returns</h4>
                  <p className="text-gray-600">
                    All products come with manufacturer warranties and we offer hassle-free 
                    returns within 7 days.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to Start Your Project?</h2>
            <p className="mb-6 text-lg">
              Get in touch with us today and let's make your dream space a reality!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="btn bg-white text-primary-600 hover:bg-gray-100">
                Contact Us
              </Link>
              <Link href="/products" className="btn bg-primary-700 hover:bg-primary-800">
                Browse Products
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
