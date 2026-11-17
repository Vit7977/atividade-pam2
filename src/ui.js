import { Pressable, StyleSheet, Text, View } from 'react-native';

export const cores = {
  fundo: '#F7F7F5',
  cartao: '#FFFFFF',
  texto: '#1F1F1D',
  suave: '#6B6A65',
  borda: '#DDDBD2',
  azul: '#185FA5',
  verde: '#0F6E56',
  vermelho: '#A32D2D',
};

// Formata número com vírgula decimal (padrão dos exercícios)
export const fmt = (n, casas = 2) =>
  Number.isFinite(n) ? n.toFixed(casas).replace('.', ',') : '—';

export const graus = (rad) => (rad * 180) / Math.PI;

export const normalizar360 = (g) => ((g % 360) + 360) % 360;

export function Botao({ titulo, detalhe, onPress, tipo = 'primario', desativado = false, estilo }) {
  const secundario = tipo === 'secundario';
  return (
    <Pressable
      onPress={onPress}
      disabled={desativado}
      style={({ pressed }) => [
        estilos.botao,
        secundario && estilos.botaoSecundario,
        (pressed || desativado) && { opacity: 0.55 },
        estilo,
      ]}
    >
      <Text style={[estilos.botaoTexto, secundario && { color: cores.azul }]}>{titulo}</Text>
      {detalhe ? (
        <Text style={[estilos.botaoDetalhe, secundario && { color: cores.suave }]}>{detalhe}</Text>
      ) : null}
    </Pressable>
  );
}

export function Cartao({ titulo, children }) {
  return (
    <View style={estilos.cartao}>
      {titulo ? <Text style={estilos.cartaoTitulo}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

export function Valor({ rotulo, valor, unidade = '', cor }) {
  return (
    <View style={estilos.valorLinha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={[estilos.valor, cor && { color: cor }]}>
        {valor} {unidade}
      </Text>
    </View>
  );
}

export function Registro({ linhas, vazio = 'Nenhum registro ainda.' }) {
  return (
    <View style={estilos.registro}>
      {linhas.length === 0 ? (
        <Text style={estilos.suave}>{vazio}</Text>
      ) : (
        linhas.map((l, i) => (
          <Text key={i} selectable style={estilos.mono}>
            {l}
          </Text>
        ))
      )}
    </View>
  );
}

export function Linha({ children }) {
  return <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>;
}

export function Ajuda({ children }) {
  return <Text style={estilos.ajuda}>{children}</Text>;
}

export const estilos = StyleSheet.create({
  tela: { padding: 16, paddingBottom: 48, gap: 12 },
  botao: {
    backgroundColor: cores.azul,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  botaoSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: cores.azul },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
  botaoDetalhe: { color: '#DCE8F5', fontSize: 12, marginTop: 2 },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 14,
  },
  cartaoTitulo: { fontSize: 16, fontWeight: '600', color: cores.texto, marginBottom: 8 },
  valorLinha: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rotulo: { fontSize: 15, color: cores.suave },
  valor: { fontSize: 18, fontFamily: 'monospace', color: cores.texto },
  registro: { marginTop: 8, gap: 4 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: cores.texto },
  suave: { color: cores.suave, fontSize: 13 },
  ajuda: { color: cores.suave, fontSize: 13, lineHeight: 19, marginBottom: 4 },
});
