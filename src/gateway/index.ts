import { PokemonGateway } from './app';
import 'dotenv/config';
// Inicia a instância única
const gateway = PokemonGateway.getInstance();
gateway.start();