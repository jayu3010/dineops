import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Filter,
  Star,
  Utensils,
  ChevronDown,
  ChevronUp,
  Leaf,
  Trees,
  Car,
  CreditCard,
  Clock,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

export type PublicRestaurant = {
  id: string;
  tenantId: string;
  name: string;
  logo: string | null;
  address: string;
  city: string;
  cuisine: string;
  description: string;
  openTime: string;
  closeTime: string;
  priceForTwo: number | null;
  vegFriendly: boolean;
  outdoorSeating: boolean;
  parkingAvailable: boolean;
  acceptsCards: boolean;
  averageRating: number | null;
  reviewCount: number;
  openNow: boolean;
};

function buildListingParams(opts: {
  q: string;
  city: string;
  cuisine: string;
  sort: string;
  openNow: boolean;
  rating4: boolean;
  vegOnly: boolean;
  outdoor: boolean;
  parking: boolean;
  cards: boolean;
  pricePreset: string;
}) {
  const p = new URLSearchParams();
  const qt = opts.q.trim();
  if (qt) p.set('q', qt);
  if (opts.city && opts.city !== 'All') p.set('city', opts.city);
  if (opts.cuisine && opts.cuisine !== 'All') p.set('cuisine', opts.cuisine);
  p.set('sort', opts.sort);
  if (opts.openNow) p.set('openNow', 'true');
  if (opts.rating4) p.set('ratingMin', '4');
  if (opts.vegOnly) p.set('vegOnly', 'true');
  if (opts.outdoor) p.set('outdoor', 'true');
  if (opts.parking) p.set('parking', 'true');
  if (opts.cards) p.set('cards', 'true');
  if (opts.pricePreset === 'budget') {
    p.set('priceMax', '500');
  } else if (opts.pricePreset === 'mid') {
    p.set('priceMin', '500');
    p.set('priceMax', '1200');
  } else if (opts.pricePreset === 'premium') {
    p.set('priceMin', '1200');
  }
  return p.toString();
}

const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || 'All');
  const [cuisine, setCuisine] = useState('All');
  const [sort, setSort] = useState('relevance');
  const [openNow, setOpenNow] = useState(false);
  const [rating4, setRating4] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [outdoor, setOutdoor] = useState(false);
  const [parking, setParking] = useState(false);
  const [cards, setCards] = useState(false);
  const [pricePreset, setPricePreset] = useState<'any' | 'budget' | 'mid' | 'premium'>('any');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = useMemo(
    () =>
      buildListingParams({
        q: search,
        city,
        cuisine,
        sort,
        openNow,
        rating4,
        vegOnly,
        outdoor,
        parking,
        cards,
        pricePreset
      }),
    [search, city, cuisine, sort, openNow, rating4, vegOnly, outdoor, parking, cards, pricePreset]
  );

  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set('search', search.trim());
    if (city && city !== 'All') next.set('city', city);
    setSearchParams(next, { replace: true });
  }, [search, city, setSearchParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['restaurants-public', queryString],
    queryFn: async () => {
      const res = await api.get(`/restaurants/public?${queryString}`);
      return {
        restaurants: res.data.data as PublicRestaurant[],
        meta: res.data.meta as { cities: string[]; cuisines: string[] }
      };
    }
  });

  const restaurants = data?.restaurants ?? [];
  const meta = data?.meta;

  const cityOptions = useMemo(() => {
    const fromApi = meta?.cities?.length ? ['All', ...meta.cities] : null;
    if (fromApi) return fromApi;
    return ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'];
  }, [meta?.cities]);

  const cuisineOptions = useMemo(() => {
    const fromApi = meta?.cuisines?.length ? ['All', ...meta.cuisines] : null;
    if (fromApi) return fromApi;
    return ['All', 'Indian', 'Chinese', 'Italian', 'Mexican', 'Japanese', 'Continental', 'Thai'];
  }, [meta?.cuisines]);

  const activeFilterCount =
    (openNow ? 1 : 0) +
    (rating4 ? 1 : 0) +
    (vegOnly ? 1 : 0) +
    (outdoor ? 1 : 0) +
    (parking ? 1 : 0) +
    (cards ? 1 : 0) +
    (pricePreset !== 'any' ? 1 : 0);

  const clearFilters = () => {
    setOpenNow(false);
    setRating4(false);
    setVegOnly(false);
    setOutdoor(false);
    setParking(false);
    setCards(false);
    setPricePreset('any');
  };

  const fmtPrice = (r: PublicRestaurant) => {
    if (r.priceForTwo == null) return '—';
    return `₹${Math.round(r.priceForTwo).toLocaleString('en-IN')} for two`;
  };

  return (
    <div className="min-h-screen bg-background-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-secondary mb-3">Explore restaurants</h1>
          <p className="text-muted max-w-2xl">
            Search by name, cuisine, or area. Filter by what matters to you — open now, ratings, price, and more.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 mb-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search name, cuisine, city, or description…"
                className="input-field pl-12 h-14 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col lg:flex-row flex-wrap gap-4 items-stretch lg:items-end">
              <div className="flex items-center gap-2 min-w-[160px]">
                <MapPin className="text-primary w-5 h-5 shrink-0" />
                <select
                  className="input-field h-12 flex-1 min-w-0"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All cities' : c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 min-w-[160px]">
                <Utensils className="text-primary w-5 h-5 shrink-0" />
                <select
                  className="input-field h-12 flex-1 min-w-0"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                >
                  {cuisineOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All cuisines' : c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 min-w-[200px]">
                <Filter className="text-primary w-5 h-5 shrink-0" />
                <select
                  className="input-field h-12 flex-1"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="rating">Sort: Rating (high)</option>
                  <option value="price_asc">Sort: Price (low → high)</option>
                  <option value="price_desc">Sort: Price (high → low)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="lg:ml-auto flex items-center justify-center gap-2 h-12 px-5 rounded-xl border-2 border-primary/30 text-primary font-bold hover:bg-orange-50 transition-colors"
              >
                <Filter size={18} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
                )}
                {filtersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-stone-100 pt-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-2">
                        Price (for two)
                      </label>
                      <select
                        className="input-field h-11 w-full"
                        value={pricePreset}
                        onChange={(e) => setPricePreset(e.target.value as typeof pricePreset)}
                      >
                        <option value="any">Any</option>
                        <option value="budget">Budget — under ₹500</option>
                        <option value="mid">Mid — ₹500 – ₹1,200</option>
                        <option value="premium">Premium — ₹1,200+</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2 flex flex-wrap gap-2 items-center">
                      {(
                        [
                          { key: 'openNow', label: 'Open now', val: openNow, set: setOpenNow, icon: Clock },
                          { key: 'rating4', label: 'Rating 4+', val: rating4, set: setRating4, icon: Star },
                          { key: 'veg', label: 'Veg friendly', val: vegOnly, set: setVegOnly, icon: Leaf },
                          { key: 'out', label: 'Outdoor', val: outdoor, set: setOutdoor, icon: Trees },
                          { key: 'park', label: 'Parking', val: parking, set: setParking, icon: Car },
                          { key: 'card', label: 'Cards', val: cards, set: setCards, icon: CreditCard }
                        ] as const
                      ).map(({ key, label, val, set, icon: Icon }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => set(!val)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                            val
                              ? 'bg-primary text-white border-primary shadow-md shadow-orange-500/20'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-primary/40'
                          }`}
                        >
                          <Icon size={16} />
                          {label}
                        </button>
                      ))}
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-stone-500 hover:text-danger"
                        >
                          <X size={16} /> Clear
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 text-sm text-muted">
          <span>
            {isLoading ? 'Loading…' : `${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'}`}
            {isFetching && !isLoading ? ' (updating…)' : ''}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted font-medium">Finding great places for you…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {restaurants.map((r) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key={r.id}
                className="group bg-white rounded-3xl overflow-hidden border border-stone-100 hover:shadow-2xl hover:border-primary/20 transition-all duration-300"
              >
                <div className="relative h-56 bg-stone-100 overflow-hidden">
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                    {r.openNow && (
                      <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                        Open now
                      </span>
                    )}
                    {r.vegFriendly && (
                      <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                        Veg friendly
                      </span>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-white/95 backdrop-blur-sm text-secondary px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1">
                      <Star className="text-amber-500 w-3.5 h-3.5" fill="currentColor" />
                      {r.averageRating != null ? r.averageRating.toFixed(1) : 'New'}
                      {r.reviewCount > 0 && (
                        <span className="text-stone-400 font-normal">({r.reviewCount})</span>
                      )}
                    </span>
                  </div>
                  {r.logo ? (
                    <img src={r.logo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Utensils size={56} />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{r.cuisine}</span>
                    <h3 className="text-xl font-bold text-secondary group-hover:text-primary transition-colors">
                      {r.name}
                    </h3>
                  </div>

                  <p className="text-sm text-muted mb-4 flex items-start gap-1">
                    <MapPin size={14} className="shrink-0 mt-0.5" />
                    <span>
                      {r.city}
                      {r.address ? ` · ${r.address.length > 42 ? `${r.address.slice(0, 42)}…` : r.address}` : ''}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {r.outdoorSeating && (
                      <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                        Outdoor
                      </span>
                    )}
                    {r.parkingAvailable && (
                      <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                        Parking
                      </span>
                    )}
                    {r.acceptsCards && (
                      <span className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                        Cards
                      </span>
                    )}
                  </div>

                  <div className="pt-5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase">Avg. for two</span>
                      <p className="font-bold text-secondary">{fmtPrice(r)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Link
                        to={`/order/${r.tenantId}`}
                        className="shrink-0 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:opacity-95 transition-opacity shadow-md shadow-orange-500/20"
                      >
                        Order online
                      </Link>
                      <Link
                        to={`/restaurant/${r.tenantId}`}
                        className="shrink-0 bg-stone-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
                      >
                        View & book
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && restaurants.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
            <p className="text-2xl font-serif font-bold text-secondary mb-2">No restaurants match</p>
            <p className="text-muted mb-6">Try clearing filters or searching with different keywords.</p>
            <button type="button" onClick={clearFilters} className="btn-primary px-6 py-2.5 rounded-xl">
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
