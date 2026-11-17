import { useEffect, useRef, useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { Accelerometer, Magnetometer } from 'expo-sensors';

import { Ajuda, Botao, Cartao, Registro, Valor, cores, estilos, fmt, graus, normalizar360 } from '../ui';

const INTERVALO_MS = 100;
// No iOS o expo-sensors reporta o acelerômetro no sentido oposto (Z ≈ -1 com a tela para cima).
// Multiplicando por este sinal, "acel" passa a apontar para CIMA nas duas plataformas.
const SINAL_ACEL = Platform.OS === 'ios' ? -1 : 1;

const norma = (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
const cruz = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const unit = (v) => {
  const n = norma(v) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
};

// Rumo "ingênuo": supõe o celular deitado (usa só X e Y do magnetômetro).
// Topo do celular (eixo Y) apontando para o norte magnético → 0°; para o leste → 90°.
function rumoSimples(m) {
  return normalizar360(graus(Math.atan2(-m.x, m.y)));
}

// Rumo com compensação de inclinação: usa a gravidade (acelerômetro) para achar
// a vertical e projeta o campo magnético no plano horizontal.
function rumoCompensado(m, cima) {
  const U = unit(cima); // vertical para cima, no sistema do aparelho
  const L = unit(cruz(m, U)); // leste = B × cima
  const N = cruz(U, L); // norte horizontal = cima × leste
  return normalizar360(graus(Math.atan2(L.y, N.y)));
}

function pontoCardeal(g) {
  const nomes = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return nomes[Math.round(g / 45) % 8];
}

export default function TelaBussola() {
  const [mag, setMag] = useState({ x: 0, y: 0, z: 0 });
  const [acel, setAcel] = useState({ x: 0, y: 0, z: 1 });
  const [referencia, setReferencia] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [rotuloTeste, setRotuloTeste] = useState(0);
  const acelRef = useRef(acel);

  useEffect(() => {
    Magnetometer.setUpdateInterval(INTERVALO_MS);
    Accelerometer.setUpdateInterval(INTERVALO_MS);
    const subM = Magnetometer.addListener(setMag);
    const subA = Accelerometer.addListener((a) => {
      const cima = { x: a.x * SINAL_ACEL, y: a.y * SINAL_ACEL, z: a.z * SINAL_ACEL };
      acelRef.current = cima;
      setAcel(cima);
    });
    return () => {
      subM.remove();
      subA.remove();
    };
  }, []);

  const B = norma(mag); // µT
  const rSimples = rumoSimples(mag);
  const rComp = rumoCompensado(mag, acel);
  const inclinacaoAparelho = graus(Math.acos(Math.min(Math.abs(unit(acel).z), 1))); // 0° = deitado
  // Inclinação magnética: ângulo do campo em relação ao plano horizontal (negativo = aponta para cima)
  const inclinacaoCampo = -graus(Math.asin((mag.x * unit(acel).x + mag.y * unit(acel).y + mag.z * unit(acel).z) / (B || 1)));
  const diferenca = Math.abs(((rSimples - rComp + 540) % 360) - 180);
  const varModulo = referencia ? ((B - referencia) / referencia) * 100 : null;

  const TESTES = [
    'Referência — centro da sala, deitado',
    'Interferência — perto da caixa de som',
    'Interferência — perto de metal',
    'Inclinação 15°',
    'Inclinação 30°',
    'Inclinação 45°',
    'Outro',
  ];

  function registrar() {
    const nome = TESTES[rotuloTeste];
    const linha =
      `${registros.length + 1}. ${nome}: Bx=${fmt(mag.x, 1)} By=${fmt(mag.y, 1)} Bz=${fmt(mag.z, 1)} µT | ` +
      `|B|=${fmt(B, 1)} µT${varModulo !== null ? ` (${varModulo >= 0 ? '+' : ''}${fmt(varModulo, 0)}%)` : ''} | ` +
      `incl.=${fmt(inclinacaoAparelho, 0)}° | rumo simples=${fmt(rSimples, 0)}° | compensado=${fmt(rComp, 0)}°`;
    setRegistros([...registros, linha]);
  }

  return (
    <View style={estilos.tela}>
      <Cartao titulo="Bússola">
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Rosa rumo={rComp} />
          <Text style={{ fontSize: 30, fontFamily: 'monospace', color: cores.texto, marginTop: 8 }}>
            {fmt(rComp, 0)}° {pontoCardeal(rComp)}
          </Text>
          <Text style={{ color: cores.suave, fontSize: 12 }}>com compensação de inclinação (norte magnético)</Text>
        </View>
        <Valor rotulo="Rumo simples (só X e Y)" valor={`${fmt(rSimples, 0)}°`} />
        <Valor
          rotulo="Diferença entre os dois"
          valor={`${fmt(diferenca, 0)}°`}
          cor={diferenca > 10 ? cores.vermelho : undefined}
        />
        <Valor rotulo="Inclinação do aparelho" valor={`${fmt(inclinacaoAparelho, 0)}°`} />
      </Cartao>

      <Cartao titulo="Campo magnético (µT)">
        <Valor rotulo="Bx" valor={fmt(mag.x, 1)} />
        <Valor rotulo="By" valor={fmt(mag.y, 1)} />
        <Valor rotulo="Bz" valor={fmt(mag.z, 1)} />
        <Valor rotulo="|B| módulo" valor={fmt(B, 1)} />
        <Valor rotulo="Inclinação do campo" valor={`${fmt(inclinacaoCampo, 0)}°`} />
        {varModulo !== null ? (
          <Valor
            rotulo="Variação de |B| vs. referência"
            valor={`${varModulo >= 0 ? '+' : ''}${fmt(varModulo, 0)}%`}
            cor={Math.abs(varModulo) > 10 ? cores.vermelho : cores.verde}
          />
        ) : null}
        <Ajuda>
          No campo da Terra, |B| fica tipicamente entre 20 e 65 µT (na região de São Paulo, ~23 µT).
          Valores muito diferentes indicam interferência. Se os números estiverem estranhos,
          calibre movendo o celular em forma de 8 no ar.
        </Ajuda>
        <Botao
          titulo={referencia ? `Referência: ${fmt(referencia, 1)} µT — redefinir` : 'Definir |B| atual como referência'}
          tipo="secundario"
          onPress={() => setReferencia(B)}
        />
      </Cartao>

      <Cartao titulo="Exercício 8 — procedimento de teste">
        <Ajuda>
          Escolha o teste, posicione o celular e toque em registrar.{'\n'}
          • |B| muda e o rumo muda sem girar → interferência magnética.{'\n'}
          • |B| igual, rumo simples muda ao inclinar, compensado não → erro de inclinação.{'\n'}
          • Dados brutos estáveis, mas rumo errado → lógica do programa.
        </Ajuda>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {TESTES.map((t, i) => (
            <Text
              key={t}
              onPress={() => setRotuloTeste(i)}
              style={{
                paddingVertical: 5,
                paddingHorizontal: 9,
                borderRadius: 14,
                borderWidth: 1,
                overflow: 'hidden',
                borderColor: i === rotuloTeste ? cores.azul : cores.borda,
                backgroundColor: i === rotuloTeste ? '#E6F1FB' : 'transparent',
                color: i === rotuloTeste ? '#0C447C' : cores.texto,
                fontSize: 12,
              }}
            >
              {t}
            </Text>
          ))}
        </View>
        <Botao titulo="Registrar este teste" onPress={registrar} />
        <Registro linhas={registros} />
        {registros.length > 0 ? (
          <Botao
            titulo="Compartilhar registros"
            tipo="secundario"
            onPress={() => Share.share({ message: ['EXERCÍCIO 8 — bússola', ...registros].join('\n') })}
          />
        ) : null}
      </Cartao>
    </View>
  );
}

function Rosa({ rumo }) {
  return (
    <View
      style={{
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 2,
        borderColor: cores.borda,
        backgroundColor: cores.cartao,
        transform: [{ rotate: `${-rumo}deg` }], // gira a rosa para o N apontar o norte real
      }}
    >
      {[
        ['N', { top: 6, alignSelf: 'center' }, cores.vermelho],
        ['L', { right: 8, top: 74 }, cores.texto],
        ['S', { bottom: 6, alignSelf: 'center' }, cores.texto],
        ['O', { left: 8, top: 74 }, cores.texto],
      ].map(([letra, pos, cor]) => (
        <Text key={letra} style={{ position: 'absolute', fontWeight: '700', fontSize: 16, color: cor, ...pos }}>
          {letra}
        </Text>
      ))}
      <View style={{ position: 'absolute', left: 82, top: 30, width: 4, height: 55, backgroundColor: cores.vermelho, borderRadius: 2 }} />
      <View style={{ position: 'absolute', left: 82, top: 85, width: 4, height: 55, backgroundColor: '#888780', borderRadius: 2 }} />
    </View>
  );
}
