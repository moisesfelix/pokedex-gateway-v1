
    import { PokemonBase, PokemonDetails } from '../types';

    const BASE_URL = 'https://pokeapi.co/api/v2';

    export const fetchPokemonList = async (limit: number = 151, offset: number = 0): Promise<PokemonBase[]> => {
      const response = await fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error('Failed to fetch pokemon list');
      const data = await response.json();
      return data.results;
    };

    export const fetchPokemonDetails = async (nameOrId: string | number): Promise<PokemonDetails> => {
      const response = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
      if (!response.ok) throw new Error('Failed to fetch pokemon details');
      return await response.json();
    };
    