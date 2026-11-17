import { useEffect, useRef, useState } from 'react';
import { Platform, Share, Text, TextInput, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';

import { Ajuda, Botao, Cartao, Linha, Registro, Valor, cores, estilos, fmt, graus } from '../ui';

// ----- Valores de referência do planejamento (Ex. 10, item 7) -----
const INTERVALO_MS = 100; // atualização a cada 100 ms
const ALFA = 0.2; // filtro: novo = 0,8·anterior + 0,2·leitura
const ENTRA_NIVELADO = 0.8; // graus — passa a "Nivelado" abaixo disso
const SAI_NIVELADO = 1.5; // graus — deixa de ser "Nivelado" acima disso
const ALCANCE_BOLHA = 10; // graus que levam a bolha até a borda
const SINAL_ACEL = Platform.OS === 'ios' ? -1 : 1; // iOS reporta Z ≈ -1 deitado

export default function TelaNivel() {
  const [ang, setAng] = useState({ x: 0, y: 0 }); // graus, já filtrados e com offset
  const [bruto, setBruto] = useState({ x: 0, y: 0, z: 1 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [nivelado, setNivelado] = useState(false);
  const [usarFiltro, setUsarFiltro] = useState(true);
  const [usarHisterese, setUsarHisterese] = useState(true);
  const [trocas, setTrocas] = useState(0); // conta mudanças de estado (evidência de "pisca")
  const [testes, setTestes] = useState([]);
  const [condicao, setCondicao] = useState('');

  const filtrado = useRef({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const niveladoRef = useRef(false);
  const cfg = useRef({ usarFiltro, usarHisterese });
  offsetRef.current = offset;
  cfg.current = { usarFiltro, usarHisterese };

  useEffect(() => {
    Accelerometer.setUpdateInterval(INTERVALO_MS);
    const sub = Accelerometer.addListener((a) => {
      const x = a.x * SINAL_ACEL;
      const y = a.y * SINAL_ACEL;
      const z = a.z * SINAL_ACEL;
      setBruto({ x, y, z });

      // Cálculo: θ = atan2(componente lateral, componente vertical)
      const thetaX = graus(Math.atan2(x, z));
      const thetaY = graus(Math.atan2(y, z));

      // Tratamento: filtro passa-baixa (média móvel exponencial)
      const f = filtrado.current;
      if (cfg.current.usarFiltro) {
        f.x = (1 - ALFA) * f.x + ALFA * thetaX;
        f.y = (1 - ALFA) * f.y + ALFA * thetaY;
      } else {
        f.x = thetaX;
        f.y = thetaY;
      }

      const ax = f.x - offsetRef.current.x;
      const ay = f.y - offsetRef.current.y;
      setAng({ x: ax, y: ay });

      // Decisão lógica: "Nivelado" com histerese (ou limite único de 1°, para comparar)
      const pior = Math.max(Math.abs(ax), Math.abs(ay));
      let novo = niveladoRef.current;
      if (cfg.current.usarHisterese) {
        if (!novo && pior < ENTRA_NIVELADO) novo = true;
        else if (novo && pior > SAI_NIVELADO) novo = false;
      } else {
        novo = pior < 1;
      }
      if (novo !== niveladoRef.current) {
        niveladoRef.current = novo;
        setNivelado(novo);
        setTrocas((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, []);

  function zerar() {
    // Guarda o ângulo atual como referência: corrige mesa, capa, ressalto da câmera
    setOffset({ x: filtrado.current.x, y: filtrado.current.y });
  }

  function registrarTeste() {
    const n = testes.length + 1;
    setTestes([
      ...testes,
      `Teste ${n}${condicao ? ` — ${condicao}` : ''}\n` +
        `  bruto: X=${fmt(bruto.x)} Y=${fmt(bruto.y)} Z=${fmt(bruto.z)} g\n` +
        `  θx=${fmt(ang.x, 1)}°  θy=${fmt(ang.y, 1)}°  estado: ${nivelado ? 'Nivelado' : 'Inclinado'}\n` +
        `  filtro: ${usarFiltro ? 'sim' : 'não'} | histerese: ${usarHisterese ? 'sim' : 'não'} | ` +
        `offset: ${fmt(offset.x, 1)}°/${fmt(offset.y, 1)}° | trocas de estado até agora: ${trocas}`,
    ]);
    setCondicao('');
  }

  // Posição da bolha: proporcional ao ângulo, limitada à borda.
  // A bolha vai para o lado mais ALTO. Lado direito mais baixo → θx negativo → bolha à esquerda.
  // Topo mais baixo → θy negativo → bolha desce na tela (translateY positivo), por isso o sinal em Y.
  const raio = 100;
  const lim = (v) => Math.max(-1, Math.min(1, v / ALCANCE_BOLHA));
  const bx = lim(ang.x) * (raio - 18);
  const by = -lim(ang.y) * (raio - 18);

  return (
    <View style={estilos.tela}>
      <Cartao>
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: raio * 2,
              height: raio * 2,
              borderRadius: raio,
              borderWidth: 2,
              borderColor: nivelado ? cores.verde : cores.borda,
              backgroundColor: nivelado ? '#E1F5EE' : '#F1EFE8',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: cores.suave }} />
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: nivelado ? cores.verde : '#BA7517',
                transform: [{ translateX: bx }, { translateY: by }],
              }}
            />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 10, color: nivelado ? cores.verde : cores.texto }}>
            {nivelado ? 'Nivelado' : 'Inclinado'}
          </Text>
        </View>
        <Valor rotulo="θx (lateral)" valor={`${fmt(ang.x, 1)}°`} />
        <Valor rotulo="θy (frontal)" valor={`${fmt(ang.y, 1)}°`} />
        <Valor rotulo="Trocas de estado" valor={String(trocas)} />
        <Linha>
          <Botao titulo="Zerar (calibrar)" onPress={zerar} estilo={{ flex: 1 }} />
          <Botao
            titulo="Remover offset"
            tipo="secundario"
            onPress={() => setOffset({ x: 0, y: 0 })}
            estilo={{ flex: 1 }}
          />
        </Linha>
      </Cartao>

      <Cartao titulo="Configuração do tratamento">
        <Ajuda>
          Desligue o filtro ou a histerese para comparar e ver o efeito de cada melhoria (use o
          contador de trocas de estado como evidência).
        </Ajuda>
        <Linha>
          <Botao
            titulo={`Filtro: ${usarFiltro ? 'ligado' : 'desligado'}`}
            tipo={usarFiltro ? 'primario' : 'secundario'}
            onPress={() => setUsarFiltro(!usarFiltro)}
            estilo={{ flex: 1 }}
          />
          <Botao
            titulo={`Histerese: ${usarHisterese ? 'ligada' : 'desligada'}`}
            tipo={usarHisterese ? 'primario' : 'secundario'}
            onPress={() => setUsarHisterese(!usarHisterese)}
            estilo={{ flex: 1 }}
          />
        </Linha>
        <Botao titulo="Zerar contador de trocas" tipo="secundario" onPress={() => setTrocas(0)} />
        <Valor rotulo="Leitura bruta (g)" valor={`${fmt(bruto.x)} / ${fmt(bruto.y)} / ${fmt(bruto.z)}`} />
      </Cartao>

      <Cartao titulo="Exercício 10 — registrar testes">
        <Ajuda>Descreva a condição física (ex.: "calço de 2 cm sob tábua de 30 cm") e registre.</Ajuda>
        <TextInput
          value={condicao}
          onChangeText={setCondicao}
          placeholder="Condição física do teste"
          placeholderTextColor={cores.suave}
          style={{
            borderWidth: 1,
            borderColor: cores.borda,
            borderRadius: 8,
            padding: 10,
            color: cores.texto,
            marginTop: 4,
          }}
        />
        <Botao titulo="Registrar teste" onPress={registrarTeste} />
        <Registro linhas={testes} />
        {testes.length > 0 ? (
          <Botao
            titulo="Compartilhar testes"
            tipo="secundario"
            onPress={() => Share.share({ message: ['EXERCÍCIO 10 — nível digital', ...testes].join('\n\n') })}
          />
        ) : null}
      </Cartao>
    </View>
  );
}
