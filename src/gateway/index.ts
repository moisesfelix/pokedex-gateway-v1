import { PokemonGateway } from './app';

// Inicia a instância única
const gateway = PokemonGateway.getInstance();
gateway.start();