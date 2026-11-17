import { StyleSheet, Text, View } from 'react-native';
import { cores, fmt } from './ui';

// Gráfico simples feito só com Views (sem bibliotecas extras).
// Cada amostra vira um ponto; a linha cinza marca o zero.
export default function Grafico({ series, min = -1.5, max = 1.5, altura = 120, unidade = 'g' }) {
  const n = Math.max(...series.map((s) => s.valores.length), 0);
  const escala = (v) => {
    const t = (Math.min(Math.max(v, min), max) - min) / (max - min);
    return altura - t * altura;
  };

  return (
    <View>
      <View style={[estilos.area, { height: altura }]}>
        {min < 0 && max > 0 ? (
          <View style={[estilos.zero, { top: escala(0) }]} />
        ) : null}
        <Text style={[estilos.eixo, { top: 0 }]}>{fmt(max, 1)}</Text>
        <Text style={[estilos.eixo, { bottom: 0 }]}>{fmt(min, 1)}</Text>
        {series.map((s) =>
          s.valores.map((v, i) => (
            <View
              key={`${s.nome}-${i}`}
              style={[
                estilos.ponto,
                {
                  left: n > 1 ? `${(i / (n - 1)) * 100}%` : 0,
                  top: escala(v) - 1.5,
                  backgroundColor: s.cor,
                },
              ]}
            />
          ))
        )}
      </View>
      <View style={estilos.legenda}>
        {series.map((s) => (
          <View key={s.nome} style={estilos.itemLegenda}>
            <View style={[estilos.marca, { backgroundColor: s.cor }]} />
            <Text style={estilos.textoLegenda}>
              {s.nome} ({unidade})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  area: {
    position: 'relative',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  zero: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: cores.borda },
  eixo: { position: 'absolute', right: 4, fontSize: 10, color: cores.suave },
  ponto: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  legenda: { flexDirection: 'row', gap: 14, marginTop: 6 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  marca: { width: 10, height: 10, borderRadius: 2 },
  textoLegenda: { fontSize: 12, color: cores.suave },
});
