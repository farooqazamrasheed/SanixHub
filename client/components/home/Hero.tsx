import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiPackage, FiAward, FiTrendingUp } from 'react-icons/fi';

export default function Hero() {
  const { t } = useTranslation('common');

  const stats = [
    { icon: FiPackage, value: '1000+', label: 'Products', color: 'from-blue-400 to-blue-600' },
    { icon: FiAward, value: '24/7', label: 'Support', color: 'from-green-400 to-green-600' },
    { icon: FiTrendingUp, value: '100%', label: 'Quality', color: 'from-yellow-400 to-yellow-600' },
    { icon: FiShoppingBag, value: 'Fast', label: 'Delivery', color: 'from-purple-400 to-purple-600' },
  ];

  return (
    <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white py-20 md:py-32 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"
        />
      </div>

      <div className="container-custom relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block mb-4"
            >
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Pakistan's Trusted Supplier
              </span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Premium{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                Sanitary
              </span>
              {' '}& Plumbing Products
            </h1>
            
            <p className="text-lg md:text-xl mb-8 text-gray-100">
              Quality products for your home and business. Trusted by professionals across Pakistan.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/products" className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg font-bold shadow-2xl inline-flex items-center gap-2">
                  <FiShoppingBag className="w-5 h-5" />
                  Shop Now
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/categories" className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 text-lg font-bold backdrop-blur-sm bg-white/10 inline-flex items-center gap-2">
                  <FiPackage className="w-5 h-5" />
                  Browse Categories
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:block"
          >
            <div className="relative">
              <motion.div 
                animate={{ rotate: [0, 5, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl transform rotate-3"
              ></motion.div>
              <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-center shadow-lg`}
                    >
                      <stat.icon className="w-8 h-8 mx-auto mb-2" />
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <div className="text-sm font-medium">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Wave shape at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(249, 250, 251)"/>
        </svg>
      </div>
    </section>
  );
}
