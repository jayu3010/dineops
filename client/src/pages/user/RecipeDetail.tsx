import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Clock, 
  Users, 
  Star, 
  ChevronLeft, 
  ChefHat, 
  ShoppingCart, 
  CheckCircle2, 
  Heart,
  Share2,
  Utensils
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_RECIPES_DETAIL = {
  '1': {
    title: 'Signature Butter Chicken',
    description: 'A rich, creamy, and velvety tomato-based gravy with tender charcoal-grilled chicken. A true classic of Indian cuisine, perfected over generations.',
    image: 'https://images.unsplash.com/photo-1603894584202-933259bb499b?auto=format&fit=crop&q=80&w=2070',
    prepTime: '45 mins',
    servings: 4,
    rating: 4.9,
    reviews: 128,
    author: 'Chef Ranveer',
    difficulty: 'Medium',
    ingredients: [
      '800g Chicken thighs, boneless',
      '400g Tomato purée',
      '100g Unsalted butter',
      '200ml Heavy cream',
      '2 tbsp Ginger-garlic paste',
      '1 tbsp Kasuri methi (dried fenugreek)',
      '1 tsp Kashmiri red chili powder',
      'Salt to taste'
    ],
    instructions: [
      'Marinate chicken with ginger-garlic paste, yogurt, and spices for at least 2 hours.',
      'Grill the chicken in a tandoor or oven until slightly charred and cooked through.',
      'In a large pan, simmer tomato purée with butter and red chili powder until thickened.',
      'Add the grilled chicken pieces to the gravy and stir in heavy cream.',
      'Finish with crushed kasuri methi and a knob of butter for that signature aroma.'
    ],
    readyToCookProducts: [
      {
        name: 'Butter Chicken Spice Kit',
        price: '₹249',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=2070',
        affiliateUrl: 'https://amazon.in/butter-chicken-kit'
      },
      {
        name: 'Organic Kasuri Methi (50g)',
        price: '₹99',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=2070',
        affiliateUrl: 'https://amazon.in/kasuri-methi'
      }
    ]
  }
};

const RecipeDetail = () => {
  const { id } = useParams();
  const recipe = MOCK_RECIPES_DETAIL[id as keyof typeof MOCK_RECIPES_DETAIL] || MOCK_RECIPES_DETAIL['1'];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="relative h-[600px] overflow-hidden">
        <img 
          src={recipe.image} 
          className="absolute inset-0 w-full h-full object-cover"
          alt={recipe.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        <div className="absolute top-10 left-10 z-20">
          <Link to="/recipes" className="flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all font-bold">
            <ChevronLeft size={20} /> Back to Recipes
          </Link>
        </div>
        <div className="absolute bottom-16 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="max-w-3xl">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">{recipe.difficulty}</span>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={18} fill="currentColor" />
                    <span className="text-white font-bold">{recipe.rating} ({recipe.reviews} Reviews)</span>
                  </div>
                </div>
                <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">{recipe.title}</h1>
                <div className="flex flex-wrap items-center gap-8 text-white/80">
                  <span className="flex items-center gap-2 text-lg font-medium"><Clock size={22} className="text-primary" /> {recipe.prepTime}</span>
                  <span className="flex items-center gap-2 text-lg font-medium"><Users size={22} className="text-primary" /> {recipe.servings} Servings</span>
                  <span className="flex items-center gap-2 text-lg font-medium"><ChefHat size={22} className="text-primary" /> {recipe.author}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button className="w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all shadow-xl">
                  <Heart size={24} />
                </button>
                <button className="w-14 h-14 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all shadow-xl">
                  <Share2 size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            <section>
              <h2 className="text-3xl font-serif font-bold text-secondary mb-6">Story behind the dish</h2>
              <p className="text-muted text-xl leading-relaxed font-light">
                {recipe.description}
              </p>
            </section>

            <section>
              <h2 className="text-3xl font-serif font-bold text-secondary mb-10 flex items-center gap-3">
                <Utensils className="text-primary" /> Ingredients
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <CheckCircle2 className="text-primary shrink-0" size={20} />
                    <span className="font-medium text-secondary">{ing}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-3xl font-serif font-bold text-secondary mb-10">Step-by-step Instructions</h2>
              <div className="space-y-10">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="flex-shrink-0 w-12 h-12 bg-stone-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold transition-transform group-hover:scale-110">
                      {i + 1}
                    </div>
                    <div className="pt-2">
                      <p className="text-lg text-secondary leading-relaxed font-medium">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar - Ready to Cook Products */}
          <div className="relative">
            <div className="sticky top-24 space-y-10">
              <div className="bg-stone-50 rounded-[2.5rem] p-10 border border-stone-100">
                <h3 className="text-2xl font-serif font-bold text-secondary mb-2">Ready to Cook?</h3>
                <p className="text-muted mb-8 text-sm uppercase tracking-widest font-bold">Affiliate Products</p>
                
                <div className="space-y-6">
                  {recipe.readyToCookProducts.map((product, i) => (
                    <div key={i} className="group bg-white p-4 rounded-3xl shadow-sm hover:shadow-xl border border-stone-100 transition-all">
                      <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
                        <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={product.name} />
                        <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-xs font-black text-secondary shadow-lg">
                          {product.price}
                        </div>
                      </div>
                      <h4 className="font-bold text-secondary mb-4 px-1">{product.name}</h4>
                      <a 
                        href={product.affiliateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                      >
                        <ShoppingCart size={18} /> Buy Now
                      </a>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-stone-200">
                  <p className="text-xs text-stone-400 text-center italic">
                    * This section contains affiliate links. We may earn a small commission on purchases made.
                  </p>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-primary/5 rounded-[2.5rem] p-10 border border-primary/10">
                <h3 className="text-2xl font-serif font-bold text-secondary mb-4 flex items-center gap-2">
                  <Star className="text-primary" size={24} /> Chef's Tip
                </h3>
                <p className="text-secondary leading-relaxed italic font-medium">
                  "For the best flavor, don't rush the onion-tomato base. Cook it slowly until the oil starts to separate. That's the secret to deep flavor."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
