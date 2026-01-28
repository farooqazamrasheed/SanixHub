import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiSend, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Successfully subscribed to newsletter!');
    setSubscribed(true);
    setEmail('');
    setLoading(false);

    // Reset subscribed state after 3 seconds
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
      </div>

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-xl"
          >
            <FiMail className="w-8 h-8" />
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Stay Updated with SanixHub
          </h2>
          <p className="text-sm mb-8 text-primary-100 max-w-2xl mx-auto">
            Subscribe to our newsletter and get exclusive updates on new products, special offers, and insider deals
          </p>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
              <div className="flex-1 relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full px-10 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/20"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading || subscribed}
                className="btn bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 text-sm font-bold rounded-xl shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full"
                    />
                    Sending...
                  </>
                ) : subscribed ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Subscribed!
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    Subscribe
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-primary-100">
            <div className="flex items-center gap-2">
              <FiCheck className="w-3 h-3" />
              <span>No spam, ever</span>
            </div>
            <div className="flex items-center gap-2">
              <FiCheck className="w-3 h-3" />
              <span>Exclusive deals</span>
            </div>
            <div className="flex items-center gap-2">
              <FiCheck className="w-3 h-3" />
              <span>Unsubscribe anytime</span>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 grid grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-xl font-bold">10k+</div>
              <div className="text-primary-200 text-xs">Subscribers</div>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-xl font-bold">Weekly</div>
              <div className="text-primary-200 text-xs">Updates</div>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="text-xl font-bold">Exclusive</div>
              <div className="text-primary-200 text-xs">Offers</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
