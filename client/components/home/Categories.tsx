import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { FiGrid, FiArrowRight } from 'react-icons/fi';
import { categoriesAPI } from '@/lib/api';

export default function Categories() {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll({ parent: 'root' }),
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-2xl h-52"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const categories = data?.data?.categories || [];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent"></div>
      
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-bold mb-4 shadow-lg"
          >
            <FiGrid className="w-3 h-3" />
            Shop by Category
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Explore Our Collections
          </h2>
          <p className="text-center text-gray-600 text-sm mb-8 max-w-2xl mx-auto">
            Find exactly what you need from our carefully organized product categories
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.slice(0, 8).map((category: any, index: number) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={`/categories/${category.slug}`}
                className="group block bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 hover:border-primary-300 overflow-hidden relative"
              >
                {/* Hover Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="text-center relative z-10">
                  {category.image?.url ? (
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <img
                        src={category.image.url}
                        alt={category.name.en}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <motion.div 
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow"
                    >
                      <FiGrid className="w-10 h-10 text-primary-600" />
                    </motion.div>
                  )}
                  <h3 className="font-bold text-base mb-1 text-gray-800 group-hover:text-primary-600 transition-colors">
                    {category.name.en}
                  </h3>
                  {category.name.ur && (
                    <p className="text-xs text-gray-500 font-urdu mb-1">{category.name.ur}</p>
                  )}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-center gap-1 text-primary-600 font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Shop Now <FiArrowRight className="w-3 h-3" />
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {categories.length > 8 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/categories" className="inline-flex items-center gap-2 btn btn-outline px-8 py-3 text-lg font-semibold shadow-md hover:shadow-lg">
                View All Categories
                <FiArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
