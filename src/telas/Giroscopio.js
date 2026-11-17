import { useEffect, useRef, useState } from 'react';
import { Share, Switch, Text, View } from 'react-native';
import { Gyroscope } from 'expo-sensors';

import { Ajuda, Botao, Cartao, Registro, Valor, cores, estilos, fmt, graus } from '../ui';

const INTERVALO_MS = 100; // Δt nominal = 0,1 s
const DURACAO_MS = 20000; // Ex. 7: pelo menos 20 s
const ZONA_MORTA = 0.01; // rad/s — abaixo disso, considera parado
const TEMPO_CALIBRACAO_MS = 2000;

export default function TelaGiroscopio() {
  const [w, setW] = useState({ x: 0, y: 0, z: 0 });
  const [anguloBruto, setAnguloBruto] = useState(0); // integra ω sem correção (rad)
  const [anguloCorrigido, setAnguloCorrigido] = useState(0); // com calibração + zona morta (rad)
  const [usarZonaMorta, setUsarZonaMorta] = useState(true);
  const [vies, setVies] = useState({ x: 0, y: 0, z: 0 });
  const [estado, setEstado] = useState('livre'); // 'livre' | 'calibrando' | 'gravando'
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);

  // refs: valores lidos dentro do listener sem recriá-lo
  const ultimoT = useRef(null);
  const brutoRef = useRef(0);
  const corrigidoRef = useRef(0);
  const viesRef = useRef(vies);
  const zonaRef = useRef(usarZonaMorta);
  const estadoRef = useRef('livre');
  const amostras = useRef([]);
  viesRef.current = vies;
  zonaRef.current = usarZonaMorta;

  useEffect(() => {
    Gyroscope.setUpdateInterval(INTERVALO_MS);
    const sub = Gyroscope.addListener((d) => {
      const agora = Date.now();
      // Δt real entre leituras, em segundos (limitado para evitar saltos após pausas)
      const dt = ultimoT.current ? Math.min((agora - ultimoT.current) / 1000, 0.5) : 0;
      ultimoT.current = agora;

      // θ = θ + ω·Δt  (eixo Z: rotação do celular deitado sobre a mesa)
      brutoRef.current += d.z * dt;

      let wz = d.z - viesRef.current.z;
      if (zonaRef.current && Math.abs(wz) < ZONA_MORTA) wz = 0;
      corrigidoRef.current += wz * dt;

      if (estadoRef.current !== 'livre') amostras.current.push({ ...d, t: agora, dt });

      setW(d);
      setAnguloBruto(brutoRef.current);
      setAnguloCorrigido(corrigidoRef.current);
    });
    return () => sub.remove();
  }, []);

  function zerarAngulos() {
    brutoRef.current = 0;
    corrigidoRef.current = 0;
    setAnguloBruto(0);
    setAnguloCorrigido(0);
  }

  function calibrar() {
    amostras.current = [];
    estadoRef.current = 'calibrando';
    setEstado('calibrando');
    setTimeout(() => {
      const a = amostras.current;
      const media = (k) => (a.length ? a.reduce((s, p) => s + p[k], 0) / a.length : 0);
      setVies({ x: media('x'), y: media('y'), z: media('z') });
      estadoRef.current = 'livre';
      setEstado('livre');
      zerarAngulos();
    }, TEMPO_CALIBRACAO_MS);
  }

  function gravar20s() {
    amostras.current = [];
    estadoRef.current = 'gravando';
    setEstado('gravando');
    setResultado(null);
    const inicio = Date.now();
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - inicio) / DURACAO_MS, 1);
      setProgresso(p);
      if (p >= 1) {
        clearInterval(timer);
        estadoRef.current = 'livre';
        setEstado('livre');
        setResultado(analisar(amostras.current));
      }
    }, 250);
  }

  async function compartilhar() {
    if (!resultado) return;
    await Share.share({ message: ['EXERCÍCIO 7 — drift do giroscópio', ...textoResultado(resultado)].join('\n') });
  }

  const corrigido = graus(anguloCorrigido);
  const bruto = graus(anguloBruto);

  return (
    <View style={estilos.tela}>
      <Cartao titulo="Velocidade angular ao vivo (rad/s)">
        <Valor rotulo="ωx" valor={fmt(w.x, 4)} />
        <Valor rotulo="ωy" valor={fmt(w.y, 4)} />
        <Valor rotulo="ωz" valor={fmt(w.z, 4)} />
      </Cartao>

      <Cartao titulo="Ângulo estimado em Z (θ = θ + ω·Δt)">
        <Ajuda>
          Deixe o celular parado na mesa. O quadrado cinza usa o ângulo sem correção; o azul usa
          calibração e zona morta. Observe qual dos dois gira sozinho.
        </Ajuda>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 12 }}>
          <Quadrado angulo={bruto} cor="#888780" rotulo="Sem correção" />
          <Quadrado angulo={corrigido} cor={cores.azul} rotulo="Corrigido" />
        </View>
        <Valor rotulo="Sem correção" valor={`${fmt(anguloBruto, 4)} rad = ${fmt(bruto, 2)}°`} />
        <Valor rotulo="Corrigido" valor={`${fmt(anguloCorrigido, 4)} rad = ${fmt(corrigido, 2)}°`} />
        <Valor rotulo="Viés usado (z)" valor={`${fmt(vies.z, 4)} rad/s`} />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: cores.texto }}>Zona morta (|ω| &lt; {fmt(ZONA_MORTA)} rad/s → 0)</Text>
          <Switch value={usarZonaMorta} onValueChange={setUsarZonaMorta} />
        </View>
        <Botao
          titulo={estado === 'calibrando' ? 'Calibrando… não mexa' : 'Calibrar (2 s parado)'}
          onPress={calibrar}
          desativado={estado !== 'livre'}
        />
        <Botao titulo="Zerar ângulos" tipo="secundario" onPress={zerarAngulos} />
      </Cartao>

      <Cartao titulo="Exercício 7 — gravação de 20 s">
        <Ajuda>
          Registre suas hipóteses antes. Depois coloque o celular parado numa superfície firme e
          toque em gravar. Não encoste nele durante a gravação.
        </Ajuda>
        <Botao
          titulo={estado === 'gravando' ? `Gravando… ${Math.round(progresso * 20)} s / 20 s` : 'Gravar 20 s'}
          onPress={gravar20s}
          desativado={estado !== 'livre'}
        />
        {resultado ? (
          <>
            <Registro linhas={textoResultado(resultado)} />
            <Botao titulo="Compartilhar resultado" tipo="secundario" onPress={compartilhar} />
          </>
        ) : null}
      </Cartao>
    </View>
  );
}

function Quadrado({ angulo, cor, rotulo }) {
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 70,
          height: 70,
          borderRadius: 8,
          backgroundColor: cor,
          transform: [{ rotate: `${-angulo}deg` }], // sinal: rotate cresce no sentido horário
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <View style={{ width: 6, height: 16, backgroundColor: '#fff', marginTop: 4, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 12, color: cores.suave }}>{rotulo}</Text>
    </View>
  );
}

function analisar(a) {
  if (a.length === 0) return { vazio: true };
  const eixos = ['x', 'y', 'z'];
  const r = { n: a.length, duracao: (a[a.length - 1].t - a[0].t) / 1000, primeiras: a.slice(0, 10) };
  r.dtMedio = a.slice(1).reduce((s, p) => s + p.dt, 0) / Math.max(a.length - 1, 1);
  eixos.forEach((k) => {
    const media = a.reduce((s, p) => s + p[k], 0) / a.length;
    const integrado = a.slice(1).reduce((s, p) => s + p[k] * p.dt, 0); // Σ ω·Δt real
    r[k] = { media, integrado, min: Math.min(...a.map((p) => p[k])), max: Math.max(...a.map((p) => p[k])) };
  });
  return r;
}

function textoResultado(r) {
  if (r.vazio) return ['Nenhuma amostra recebida.'];
  const linhas = [
    `Amostras: ${r.n} em ${fmt(r.duracao, 1)} s (Δt médio = ${fmt(r.dtMedio, 3)} s)`,
    '',
    'Primeiras 10 leituras (rad/s):',
    ...r.primeiras.map(
      (p, i) => `${String(i + 1).padStart(2, ' ')}: x = ${fmt(p.x, 4)}  y = ${fmt(p.y, 4)}  z = ${fmt(p.z, 4)}`
    ),
    '',
  ];
  ['x', 'y', 'z'].forEach((k) => {
    const e = r[k];
    linhas.push(
      `Eixo ${k.toUpperCase()}: média ${fmt(e.media, 4)} rad/s | mín ${fmt(e.min, 4)} | máx ${fmt(e.max, 4)}`,
      `   ângulo acumulado em ${fmt(r.duracao, 1)} s: ${fmt(e.integrado, 4)} rad = ${fmt(graus(e.integrado), 2)}°`,
      `   projeção para 10 min (média × 600 s): ${fmt(graus(e.media * 600), 1)}°`
    );
  });
  return linhas;
}
