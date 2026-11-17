import { useEffect, useRef, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';

import Grafico from '../Grafico';
import { Ajuda, Botao, Cartao, Linha, Registro, Valor, cores, estilos, fmt } from '../ui';

const INTERVALO_MS = 50; // 20 leituras por segundo
const DURACAO_GRAVACAO_MS = 4000; // Ex. 2: 4 segundos por experiência

const modulo = ({ x, y, z }) => Math.sqrt(x * x + y * y + z * z);

export default function TelaAcelerometro() {
  const [dados, setDados] = useState({ x: 0, y: 0, z: 0 });
  const [leituras, setLeituras] = useState([]); // Ex. 1
  const [gravando, setGravando] = useState(null); // 'A' | 'B' | null
  const [resultados, setResultados] = useState({}); // Ex. 2: { A: {...}, B: {...} }
  const amostras = useRef([]);
  const gravandoRef = useRef(null);

  useEffect(() => {
    Accelerometer.setUpdateInterval(INTERVALO_MS);
    const sub = Accelerometer.addListener((d) => {
      setDados(d);
      if (gravandoRef.current) amostras.current.push({ ...d, t: Date.now() });
    });
    return () => sub.remove();
  }, []);

  // ---------- Exercício 1 ----------
  const eixos = { X: dados.x, Y: dados.y, Z: dados.z };
  const eixoMaior = Object.keys(eixos).reduce((a, b) =>
    Math.abs(eixos[a]) > Math.abs(eixos[b]) ? a : b
  );

  function registrarLeitura() {
    if (leituras.length >= 5) return;
    setLeituras([...leituras, { ...dados }]);
  }

  const linhasEx1 = leituras.map(
    (l, i) => `Leitura ${i + 1}: X = ${fmt(l.x)}  Y = ${fmt(l.y)}  Z = ${fmt(l.z)}  |a| = ${fmt(modulo(l))}`
  );

  // ---------- Exercício 2 ----------
  function gravar(experiencia) {
    amostras.current = [];
    gravandoRef.current = experiencia;
    setGravando(experiencia);
    setTimeout(() => {
      gravandoRef.current = null;
      setGravando(null);
      setResultados((r) => ({ ...r, [experiencia]: resumir(amostras.current) }));
    }, DURACAO_GRAVACAO_MS);
  }

  async function compartilhar() {
    const partes = ['EXERCÍCIO 1 — leituras do acelerômetro (g)', ...linhasEx1, ''];
    ['A', 'B'].forEach((e) => {
      if (resultados[e]) partes.push(`EXERCÍCIO 2 — Experiência ${e}`, ...textoResumo(resultados[e]), '');
    });
    await Share.share({ message: partes.join('\n') });
  }

  return (
    <View style={estilos.tela}>
      <Cartao titulo="Leitura ao vivo (em g)">
        <Valor rotulo="X" valor={fmt(dados.x)} />
        <Valor rotulo="Y" valor={fmt(dados.y)} />
        <Valor rotulo="Z" valor={fmt(dados.z)} />
        <Valor rotulo="|a| = √(X²+Y²+Z²)" valor={fmt(modulo(dados))} />
        <Text style={{ color: cores.verde, marginTop: 6 }}>
          Maior valor absoluto: eixo {eixoMaior} ({eixos[eixoMaior] >= 0 ? 'positivo' : 'negativo'})
        </Text>
      </Cartao>

      <Cartao titulo="Exercício 1 — cinco leituras">
        <Ajuda>
          Registre a previsão antes de olhar os números. Sugestão de posições: deitado com a tela
          para cima, tela para baixo, em pé, deitado de lado e inclinado ~45°.
        </Ajuda>
        <Botao
          titulo={`Registrar leitura (${leituras.length}/5)`}
          onPress={registrarLeitura}
          desativado={leituras.length >= 5}
        />
        <Registro linhas={linhasEx1} />
        {leituras.length > 0 ? (
          <Botao titulo="Limpar leituras" tipo="secundario" onPress={() => setLeituras([])} />
        ) : null}
      </Cartao>

      <Cartao titulo="Exercício 2 — movimento ou inclinação?">
        <Ajuda>
          Deixe o celular deitado. Toque em gravar e, durante 4 segundos, faça o movimento.{'\n'}
          A: deslize rápido para a direita e volte.{'\n'}
          B: incline devagar para a direita e mantenha parado.
        </Ajuda>
        <Linha>
          <Botao
            titulo={gravando === 'A' ? 'Gravando…' : 'Gravar A'}
            detalhe="deslocamento rápido"
            onPress={() => gravar('A')}
            desativado={!!gravando}
            estilo={{ flex: 1 }}
          />
          <Botao
            titulo={gravando === 'B' ? 'Gravando…' : 'Gravar B'}
            detalhe="inclinação lenta"
            onPress={() => gravar('B')}
            desativado={!!gravando}
            estilo={{ flex: 1 }}
          />
        </Linha>

        {['A', 'B'].map((e) =>
          resultados[e] ? (
            <View key={e} style={{ marginTop: 14 }}>
              <Text style={{ fontWeight: '600', color: cores.texto }}>Experiência {e}</Text>
              <Grafico
                series={[
                  { nome: 'X', cor: '#D85A30', valores: resultados[e].serie.map((s) => s.x) },
                  { nome: 'Z', cor: '#534AB7', valores: resultados[e].serie.map((s) => s.z) },
                ]}
              />
              <Registro linhas={textoResumo(resultados[e])} />
            </View>
          ) : null
        )}
      </Cartao>

      <Botao
        titulo="Compartilhar registros"
        detalhe="envia o texto para WhatsApp, e-mail, Drive…"
        onPress={compartilhar}
        desativado={leituras.length === 0 && !resultados.A && !resultados.B}
      />
    </View>
  );
}

// Resume uma gravação: valores no início, no fim, mínimos, máximos
// e quanto |a| se afastou de 1 g (sinal de aceleração real).
function resumir(serie) {
  if (serie.length === 0) return { serie, vazio: true };
  const media = (arr, k) => arr.reduce((s, a) => s + a[k], 0) / arr.length;
  const inicio = serie.slice(0, 5);
  const fim = serie.slice(-5);
  const eixos = ['x', 'y', 'z'];
  const r = { serie, amostras: serie.length };
  eixos.forEach((k) => {
    const vals = serie.map((s) => s[k]);
    r[k] = {
      inicio: media(inicio, k),
      fim: media(fim, k),
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  });
  r.desvioMaxModulo = Math.max(...serie.map((s) => Math.abs(modulo(s) - 1)));
  return r;
}

function textoResumo(r) {
  if (r.vazio) return ['Nenhuma amostra recebida.'];
  return [
    `Amostras: ${r.amostras} (a cada ${INTERVALO_MS} ms)`,
    ...['x', 'y', 'z'].map(
      (k) =>
        `${k.toUpperCase()}: início ${fmt(r[k].inicio)} | fim ${fmt(r[k].fim)} | mín ${fmt(r[k].min)} | máx ${fmt(r[k].max)} | variação ${fmt(r[k].max - r[k].min)}`
    ),
    `Maior afastamento de |a| em relação a 1 g: ${fmt(r.desvioMaxModulo)} g`,
  ];
}
