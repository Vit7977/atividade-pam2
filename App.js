import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import TelaAcelerometro from './src/telas/Acelerometro';
import TelaGiroscopio from './src/telas/Giroscopio';
import TelaBussola from './src/telas/Bussola';
import TelaNivel from './src/telas/Nivel';
import { cores } from './src/ui';

// Uma aba por experimento. Só a aba aberta fica montada,
// então só os sensores dela ficam ligados (economiza bateria).
const ABAS = [
  { id: 'acel', nome: 'Acelerômetro', exercicios: 'Ex. 1 e 2', Tela: TelaAcelerometro },
  { id: 'giro', nome: 'Giroscópio', exercicios: 'Ex. 7', Tela: TelaGiroscopio },
  { id: 'bussola', nome: 'Bússola', exercicios: 'Ex. 8', Tela: TelaBussola },
  { id: 'nivel', nome: 'Nível', exercicios: 'Ex. 10', Tela: TelaNivel },
];

export default function App() {
  const [abaId, setAbaId] = useState('acel');
  const aba = ABAS.find((a) => a.id === abaId);
  const Tela = aba.Tela;

  return (
    <SafeAreaView style={estilos.raiz}>
      <StatusBar barStyle="dark-content" />
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Sensores — testes</Text>
        <Text style={estilos.subtitulo}>Programação Mobile 2</Text>
      </View>

      <View style={estilos.abas}>
        {ABAS.map((a) => {
          const ativa = a.id === abaId;
          return (
            <Pressable
              key={a.id}
              onPress={() => setAbaId(a.id)}
              style={[estilos.aba, ativa && estilos.abaAtiva]}
            >
              <Text style={[estilos.abaNome, ativa && estilos.abaNomeAtiva]}>{a.nome}</Text>
              <Text style={[estilos.abaEx, ativa && estilos.abaNomeAtiva]}>{a.exercicios}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        <Tela key={abaId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo, paddingTop: StatusBar.currentHeight || 0 },
  cabecalho: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  titulo: { fontSize: 22, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 13, color: cores.suave },
  abas: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, paddingBottom: 8 },
  aba: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
    alignItems: 'center',
  },
  abaAtiva: { backgroundColor: cores.azul, borderColor: cores.azul },
  abaNome: { fontSize: 12, fontWeight: '600', color: cores.texto },
  abaEx: { fontSize: 11, color: cores.suave },
  abaNomeAtiva: { color: '#fff' },
});
