import React, { useState } from 'react';
import RecipeCard, { Recipe } from '../../components/RecipeCard';
import { Search, Filter, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Signature Butter Chicken',
    description: 'A rich, creamy, and velvety tomato-based gravy with tender charcoal-grilled chicken. A true classic of Indian cuisine.',
    image: 'https://images.unsplash.com/photo-1603894584202-933259bb499b?auto=format&fit=crop&q=80&w=2070',
    prepTime: '45 mins',
    servings: 4,
    rating: 4.9,
    author: 'Chef Ranveer',
    difficulty: 'Medium'
  },
  {
    id: '2',
    title: 'Artisan Neapolitan Pizza',
    description: 'Learn the secret to a perfectly thin, blistered crust and authentic San Marzano tomato sauce. Simple yet sophisticated.',
    image: 'https://images.unsplash.com/photo-1574123221817-4372c9b85056?auto=format&fit=crop&q=80&w=2070',
    prepTime: '120 mins',
    servings: 2,
    rating: 4.8,
    author: 'Chef Marco',
    difficulty: 'Hard'
  },
  {
    id: '3',
    title: 'Thai Green Curry',
    description: 'A vibrant and aromatic curry made from scratch with fresh green chilies, lemongrass, and galangal. Perfectly balanced.',
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80&w=2070',
    prepTime: '30 mins',
    servings: 3,
    rating: 4.7,
    author: 'Chef Somsak',
    difficulty: 'Easy'
  },
  {
    id: '4',
    title: 'Classic Beef Wellington',
    description: 'The ultimate dinner party showstopper. Tender beef fillet wrapped in mushroom duxelles, parma ham, and golden puff pastry.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=2070',
    prepTime: '90 mins',
    servings: 6,
    rating: 4.9,
    author: 'Chef Gordon',
    difficulty: 'Hard'
  },
  {
    id: '5',
    title: 'Mediterranean Quinoa Salad',
    description: 'A light, refreshing, and protein-packed salad with cucumber, olives, feta, and a zesty lemon-herb vinaigrette.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=2070',
    prepTime: '15 mins',
    servings: 2,
    rating: 4.6,
    author: 'Chef Elena',
    difficulty: 'Easy'
  },
  {
    id: '6',
    title: 'Japanese Miso Ramen',
    description: 'Rich, savory broth simmered for 12 hours, topped with tender chashu pork, marinated soft-boiled egg, and springy noodles.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=2070',
    prepTime: '180 mins',
    servings: 2,
    rating: 5.0,
    author: 'Chef Hiroki',
    difficulty: 'Medium'
  }
];

const RecipesPage = () => {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');

  const filteredRecipes = MOCK_RECIPES.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficulty === 'All' || r.difficulty === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-background-light py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <ChefHat className="text-primary" size={24} />
            </div>
            <span className="text-primary font-bold tracking-widest uppercase text-sm">Culinary Arts</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-serif font-bold text-secondary mb-6"
          >
            Master Your <span className="text-primary italic">Kitchen.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted text-xl max-w-2xl mx-auto font-light"
          >
            Explore professional recipes from world-renowned chefs. 
            From quick weeknight meals to weekend masterpieces.
          </motion.p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-stone-100 mb-12 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300" size={20} />
            <input 
              type="text" 
              placeholder="Search recipes, ingredients, or chefs..."
              className="w-full pl-16 pr-6 py-5 bg-stone-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 px-4">
            <Filter className="text-primary" size={20} />
            <div className="flex gap-2">
              {['All', 'Easy', 'Medium', 'Hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-6 py-3 rounded-2xl font-bold transition-all ${
                    difficulty === level 
                      ? 'bg-stone-900 text-white shadow-lg' 
                      : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-stone-200">
            <ChefHat size={48} className="mx-auto text-stone-300 mb-4" />
            <h3 className="text-2xl font-serif font-bold text-secondary mb-2">No recipes found</h3>
            <p className="text-muted font-light">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipesPage;
