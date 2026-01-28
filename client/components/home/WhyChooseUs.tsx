import { motion } from 'framer-motion';
import { FiShield, FiDollarSign, FiCreditCard, FiHeadphones } from 'react-icons/fi';

export default function WhyChooseUs() {
  const features = [
    {
      icon: FiShield,
      title: 'Quality Guaranteed',
      description: 'All products are sourced from trusted manufacturers and tested for quality',
      color: 'from-green-400 to-green-600',
      bgColor: 'from-green-50 to-green-100',
    },
    {
      icon: FiDollarSign,
      title: 'Best Prices',
      description: 'Competitive pricing without compromising on quality',
      color: 'from-blue-400 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
    },
    {
      icon: FiCreditCard,
      title: 'Cash on Pickup',
      description: 'Pay when you collect your order - simple and secure',
      color: 'from-purple-400 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
    },
    {
      icon: FiHeadphones,
      title: '24/7 Support',
      description: 'Our team is always available to help with your queries via WhatsApp',
      color: 'from-orange-400 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-20 -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-20 -translate-y-1/2"></div>

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
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-700 text-white px-3 py-1.5 rounded-full text-xs font-bold mb-4 shadow-lg"
          >
            <FiShield className="w-3 h-3" />
            Why Choose Us
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Your Trusted Partner
          </h2>
          <p className="text-gray-600 text-sm max-w-2xl mx-auto">
            We are committed to providing the best products and exceptional service to our valued customers
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="text-center group"
            >
              <div className={`relative mx-auto w-full p-6 bg-gradient-to-br ${feature.bgColor} rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300 border border-gray-100`}>
                <motion.div
                  initial={{ rotate: 0 }}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} text-white rounded-2xl mb-4 shadow-lg group-hover:shadow-xl`}
                >
                  <feature.icon className="w-8 h-8" />
                </motion.div>
                <h3 className="text-lg font-bold mb-2 text-gray-800 group-hover:text-primary-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-8 md:p-12 text-white text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="inline-block mb-3"
            >
              <FiShield className="w-12 h-12 mx-auto mb-3" />
            </motion.div>
            <h3 className="text-xl md:text-2xl font-bold mb-3">Trusted by Thousands</h3>
            <p className="text-primary-100 text-sm max-w-2xl mx-auto mb-4">
              Join our growing community of satisfied customers across Pakistan who trust us for their sanitary and plumbing needs
            </p>
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-2xl font-bold">5000+</div>
                <div className="text-primary-200 text-xs">Happy Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">98%</div>
                <div className="text-primary-200 text-xs">Satisfaction Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold">15+</div>
                <div className="text-primary-200 text-xs">Years Experience</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
