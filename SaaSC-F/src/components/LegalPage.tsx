import { ArrowLeft, Database, FileText, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { VivreLogo } from './branding/VivreLogo';

export type LegalPageKind = 'privacidad' | 'terminos' | 'eliminar-datos';

const COMPANY = 'Crimson Signal Technologies';
const EMAIL = 'crimsonsignal426@gmail.com';
const ADDRESS = 'Natura, sección Amanecer, Llanuras 15861';

const pageMeta = {
  privacidad: { title: 'Aviso de privacidad', subtitle: 'Cómo protegemos y utilizamos tus datos.', icon: ShieldCheck },
  terminos: { title: 'Términos y condiciones', subtitle: 'Reglas para el uso responsable de Vivre.', icon: FileText },
  'eliminar-datos': { title: 'Eliminación de datos', subtitle: 'Procedimiento para solicitar acceso, corrección o eliminación.', icon: Trash2 },
} satisfies Record<LegalPageKind, { title: string; subtitle: string; icon: typeof ShieldCheck }>;

function PrivacyContent() {
  return <>
    <Section title="Responsable del tratamiento">
      <p><strong>{COMPANY}</strong>, con domicilio en {ADDRESS}, es responsable del tratamiento de los datos utilizados por Vivre. Para asuntos de privacidad puedes escribir a <EmailLink />.</p>
    </Section>
    <Section title="Datos que podemos tratar">
      <p>Datos de identificación y contacto; nombre, teléfono de WhatsApp, correo, departamento y relación con el condominio; cuentas y roles administrativos; pagos, comprobantes, saldos y multas; registros de mascotas, visitas, eventos, estacionamiento e incidencias; archivos o fotografías que el usuario decida adjuntar; mensajes enviados al bot; y datos técnicos de seguridad, sesión y auditoría.</p>
      <p>No solicitamos datos personales sensibles de manera ordinaria. Evita incluir información sensible o de terceros que no sea necesaria en fotografías, comprobantes y documentos.</p>
    </Section>
    <Section title="Finalidades">
      <p>Usamos los datos para identificar usuarios y condominios; operar pagos y estados de cuenta; administrar residentes, accesos y servicios condominales; enviar notificaciones solicitadas u operativas por WhatsApp; atender soporte; prevenir fraude y accesos no autorizados; mantener bitácoras y respaldos; y cumplir obligaciones legales.</p>
      <p>Cuando se habilitan funciones de inteligencia artificial, se utilizan únicamente para clasificar solicitudes relacionadas con el condominio o preparar borradores a partir de documentos. Las decisiones administrativas finales corresponden al comité o a la gerencia.</p>
    </Section>
    <Section title="Proveedores y transferencias">
      <p>Para prestar el servicio podemos utilizar proveedores de infraestructura y procesamiento, incluidos Meta/WhatsApp, Render, Neon, Amazon Web Services y OpenAI. Sólo reciben los datos necesarios para su función y pueden procesarlos fuera de México bajo sus propias medidas contractuales y de seguridad. No vendemos datos personales.</p>
    </Section>
    <Section title="Conservación y seguridad">
      <p>La información se conserva mientras la cuenta o la relación condominal esté activa y durante los periodos necesarios para obligaciones contables, legales, resolución de controversias y seguridad. Después se elimina, bloquea o anonimiza, considerando los ciclos de respaldo. Aplicamos controles de acceso, cifrado en tránsito, separación por condominio y registros de auditoría.</p>
    </Section>
    <Section title="Derechos ARCO y preferencias">
      <p>Puedes solicitar acceso, rectificación, cancelación u oposición, así como limitar comunicaciones, escribiendo a <EmailLink /> con el asunto <strong>“Solicitud ARCO - Vivre”</strong>. Indica tu nombre, medio de contacto, condominio y departamento, el derecho que deseas ejercer y una descripción clara de los datos. Podremos solicitar información para verificar tu identidad.</p>
    </Section>
    <Section title="Cambios al aviso">
      <p>Las modificaciones se publicarán en esta misma dirección. Última actualización: 27 de agosto de 2026.</p>
    </Section>
  </>;
}

function TermsContent() {
  return <>
    <Section title="Objeto del servicio">
      <p>Vivre es una plataforma de administración condominal operada por {COMPANY}. Permite gestionar residentes, comprobantes, cuotas, multas, eventos, estacionamiento, incidencias, comunicaciones y otras funciones habilitadas para cada condominio.</p>
    </Section>
    <Section title="Cuentas y autorización">
      <p>El usuario debe proporcionar información veraz, proteger sus credenciales y utilizar únicamente los permisos que le hayan sido asignados. Las acciones realizadas con una cuenta se registran para fines de auditoría. El administrador del condominio es responsable de mantener actualizados sus usuarios y permisos.</p>
    </Section>
    <Section title="Uso permitido">
      <p>No se permite vulnerar la seguridad, acceder a otro condominio, cargar contenido ilícito, suplantar identidades, enviar comunicaciones abusivas ni usar la plataforma para fines distintos de la operación condominal. Los archivos deben ser pertinentes y contar con autorización para su tratamiento.</p>
    </Section>
    <Section title="Información financiera">
      <p>Vivre registra y presenta información administrativa, pero no es una institución bancaria ni ejecuta transferencias. El comité o la gerencia valida comprobantes, pagos en efectivo, saldos, cuotas y multas, y conserva la responsabilidad sobre sus registros y decisiones.</p>
    </Section>
    <Section title="Servicios externos y disponibilidad">
      <p>Algunas funciones dependen de Meta/WhatsApp, servicios de alojamiento, almacenamiento, base de datos o inteligencia artificial. Pueden existir mantenimientos o interrupciones ajenas a Vivre. Procuraremos restaurar el servicio y proteger la integridad de la información con medidas razonables.</p>
    </Section>
    <Section title="Suspensión y terminación">
      <p>Podemos limitar o suspender el acceso por falta de licencia, riesgo de seguridad, uso indebido o incumplimiento. La suspensión no elimina automáticamente los registros sujetos a conservación legal o administrativa.</p>
    </Section>
    <Section title="Contacto y legislación">
      <p>Estos términos se interpretan conforme a las leyes aplicables en México. Para soporte o aclaraciones escribe a <EmailLink />. Última actualización: 27 de agosto de 2026.</p>
    </Section>
  </>;
}

function DeletionContent() {
  const subject = encodeURIComponent('Eliminación de datos - Vivre');
  return <>
    <Section title="Cómo presentar una solicitud">
      <p>Envía un correo a <EmailLink /> con el asunto <strong>“Eliminación de datos - Vivre”</strong>. Incluye tu nombre, teléfono asociado, condominio, departamento, descripción de los datos y el alcance solicitado. No envíes contraseñas.</p>
      <a href={`mailto:${EMAIL}?subject=${subject}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">
        <Mail size={16}/> Iniciar solicitud por correo
      </a>
    </Section>
    <Section title="Verificación y atención">
      <p>Confirmaremos la recepción y podremos pedir información razonable para verificar identidad y evitar que un tercero elimine tus datos. Revisaremos los sistemas asociados a Vivre y comunicaremos el resultado por el mismo medio.</p>
    </Section>
    <Section title="Alcance de la eliminación">
      <p>Cuando proceda, eliminaremos o anonimizaremos la información de los sistemas activos y la retiraremos de respaldos conforme a su ciclo de conservación. Algunos registros podrán bloquearse y conservarse cuando sean necesarios para obligaciones fiscales, contables, legales, de seguridad o para resolver controversias.</p>
      <p>Si perteneces a un condominio, algunos datos administrativos también están bajo control de su gerencia o comité. En esos casos coordinaremos la solicitud con el responsable correspondiente.</p>
    </Section>
    <Section title="Otras solicitudes">
      <p>El mismo canal sirve para solicitar acceso, corrección, oposición o limitación de comunicaciones. Domicilio de contacto: {ADDRESS}.</p>
    </Section>
  </>;
}

function EmailLink() {
  return <a className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-900" href={`mailto:${EMAIL}`}>{EMAIL}</a>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-b border-slate-100 py-6 last:border-0">
    <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-slate-600">{children}</div>
  </section>;
}

export default function LegalPage({ kind }: { kind: LegalPageKind }) {
  const meta = pageMeta[kind];
  const Icon = meta.icon;
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <a href="/" aria-label="Volver al inicio"><VivreLogo /></a>
        <a href="/" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"><ArrowLeft size={16}/> Volver al acceso</a>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><Icon size={24}/></div>
        <div><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{meta.title}</h1><p className="mt-2 text-slate-500">{meta.subtitle}</p></div>
      </div>
      <article className="rounded-2xl border border-slate-200 bg-white px-6 shadow-sm sm:px-9">
        {kind === 'privacidad' ? <PrivacyContent/> : kind === 'terminos' ? <TermsContent/> : <DeletionContent/>}
      </article>
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><Database size={14}/> Vivre · {COMPANY}</div>
    </div>
  </main>;
}
