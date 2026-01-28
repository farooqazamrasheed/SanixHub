import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Layout from '@/components/Layout';
import Hero from '@/components/home/Hero';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Categories from '@/components/home/Categories';
import FeaturedBrands from '@/components/home/FeaturedBrands';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import Newsletter from '@/components/home/Newsletter';

export default function Home() {
  const { t } = useTranslation('common');

  return (
    <>
      <NextSeo
        title="SanixHub - Premium Sanitary & Plumbing Products in Pakistan"
        description="Shop the best quality sanitary and plumbing products including Muslim showers, fittings, taps, pipes and more. Trusted supplier across Pakistan."
        canonical="https://sanixhub.com"
        openGraph={{
          url: 'https://sanixhub.com',
          title: 'SanixHub - Premium Sanitary & Plumbing Products',
          description: 'Quality sanitary and plumbing products at competitive prices',
          images: [
            {
              url: '/images/og-image.jpg',
              width: 1200,
              height: 630,
              alt: 'SanixHub',
            },
          ],
          siteName: 'SanixHub',
        }}
      />
      
      <Layout>
        {/* Hero Section */}
        <Hero />

        {/* Featured Products */}
        <FeaturedProducts />

        {/* Categories */}
        <Categories />

        {/* Featured Brands */}
        <FeaturedBrands />

        {/* Why Choose Us */}
        <WhyChooseUs />

        {/* Newsletter */}
        <Newsletter />
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
