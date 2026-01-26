interface RoomCodeProps {
  code: string;
  label?: string;
}

export default function RoomCode({ code, label = "Room Code" }: RoomCodeProps) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-wider text-gray-900">{code}</p>
    </div>
  );
}
