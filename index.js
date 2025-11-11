import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";
dotenv.config();

const { Client, LocalAuth } = pkg;

// Inicializar cliente
const client = new Client({
  authStrategy: new LocalAuth(),
});

const admins = process.env.ADMINS.split(",");

// Lista de giveaways activos
let giveaways = [];

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("📱 Escanea el QR para iniciar sesión en WhatsApp Web.");
});

client.on("ready", () => {
  console.log("✅ Bot de WhatsApp conectado correctamente.");
});

// 📘 Comandos
client.on("message", async (message) => {
  if (!message.body.startsWith("/")) return;
  const args = message.body.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const author = message.from.split("@")[0];

  // 🔒 Verificar admin
  const isAdmin = admins.includes(author);

  // --- Comando /ban ---
  if (command === "ban") {
    if (!isAdmin) return message.reply("❌ No tienes permiso para usar este comando.");
    const user = args[0];
    if (!user) return message.reply("⚠️ Usa: /ban <número>");
    message.reply(`🚫 El usuario *${user}* ha sido baneado del grupo.`);
  }

  // --- Comando /warn ---
  else if (command === "warn") {
    if (!isAdmin) return message.reply("❌ No tienes permiso para usar este comando.");
    const user = args[0];
    const reason = args.slice(1).join(" ") || "Sin motivo especificado";
    message.reply(`⚠️ Advertencia para *${user}*\nMotivo: ${reason}`);
  }

  // --- Comando /kick ---
  else if (command === "kick") {
    if (!isAdmin) return message.reply("❌ No tienes permiso para usar este comando.");
    const user = args[0];
    if (!user) return message.reply("⚠️ Usa: /kick <número>");
    message.reply(`👢 *${user}* ha sido expulsado del grupo.`);
  }

  // --- Comando /giveaway ---
  else if (command === "giveaway") {
    const premio = args.join(" ");
    if (!premio) return message.reply("🎁 Usa: /giveaway <premio>");

    const duracion = 1; // minutos
    const mensaje = await message.reply(
      `🎉 *GIVEAWAY INICIADO* 🎉\n\n🏆 Premio: *${premio}*\n🕐 Duración: ${duracion} minuto(s)\n\n📲 Reacciona a este mensaje con un emoji para participar.`
    );

    giveaways.push({
      chatId: message.from,
      premio,
      participantes: [],
      mensajeId: mensaje.id._serialized,
    });

    // Selecciona ganador después del tiempo
    setTimeout(async () => {
      const g = giveaways.find((x) => x.mensajeId === mensaje.id._serialized);
      if (!g) return;

      if (g.participantes.length === 0) {
        await mensaje.reply("😢 Nadie participó en el giveaway.");
      } else {
        const ganador = g.participantes[Math.floor(Math.random() * g.participantes.length)];
        await mensaje.reply(`🏆 @${ganador.split("@")[0]} ha ganado *${g.premio}*! 🎉`, {
          mentions: [ganador],
        });
      }
      giveaways = giveaways.filter((x) => x.mensajeId !== mensaje.id._serialized);
    }, duracion * 60 * 1000);
  }

  // --- Comando /help ---
  else if (command === "help") {
    message.reply(`📘 *Comandos del bot:*
/ban <número> — Banea a un usuario
/warn <número> <motivo> — Advierte a un usuario
/kick <número> — Expulsa a un usuario
/giveaway <premio> — Inicia un sorteo
/help — Muestra este mensaje`);
  }
});

// 💬 Detectar reacciones (para giveaways)
client.on("message_reaction", async (reaction) => {
  const g = giveaways.find((x) => x.mensajeId === reaction.msgId._serialized);
  if (g) {
    const participante = reaction.senderId;
    if (!g.participantes.includes(participante)) {
      g.participantes.push(participante);
      console.log(`✅ Nuevo participante: ${participante}`);
    }
  }
});

client.initialize();
