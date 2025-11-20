import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { APP_TITLE } from "@/const";

export default function Home() {
  const [voterIdentifier, setVoterIdentifier] = useState<string>("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [votingComplete, setVotingComplete] = useState(false);
  const [error, setError] = useState<string>("");

  // Get voter identifier from browser/device
  useEffect(() => {
    const getVoterIdentifier = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setVoterIdentifier(data.ip);
      } catch (err) {
        // Fallback to browser fingerprint if IP fetch fails
        const browserId = navigator.userAgent + navigator.language + screen.width + screen.height;
        setVoterIdentifier(btoa(browserId));
      }
    };

    getVoterIdentifier();
  }, []);

  // Get candidates
  const { data: candidates = [], isLoading: candidatesLoading } = trpc.voting.getCandidates.useQuery();

  // Check if already voted
  const { data: hasAlreadyVoted = false } = trpc.voting.hasVoted.useQuery(
    { voterIdentifier },
    { enabled: !!voterIdentifier }
  );

  // Vote mutation
  const voteMutation = trpc.voting.vote.useMutation({
    onSuccess: () => {
      setVotingComplete(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "فشل التصويت");
    },
  });

  const handleVote = () => {
    if (!selectedCandidateId || !voterIdentifier) {
      setError("يرجى اختيار مرشح");
      return;
    }

    voteMutation.mutate({
      candidateId: selectedCandidateId,
      voterIdentifier,
    });
  };

  if (candidatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (hasAlreadyVoted && !votingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-orange-500" />
            </div>
            <CardTitle className="text-2xl">تم التصويت مسبقاً</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              هذا الجهاز قد قام بالتصويت بالفعل. لا يمكن التصويت أكثر من مرة من نفس الجهاز.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                شكراً لمشاركتك في العملية الانتخابية
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (votingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">شكراً لتصويتك!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-6">
              تم تسجيل صوتك بنجاح. النتائج الحالية:
            </p>
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-800">{candidate.name}</span>
                  <span className="text-lg font-bold text-indigo-600">{candidate.votes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{APP_TITLE}</h1>
          <p className="text-gray-600">اختر مرشحك المفضل</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Candidates Cards */}
        <div className="space-y-4 mb-8">
          {candidates.map((candidate) => (
            <Card
              key={candidate.id}
              className={`cursor-pointer transition-all ${
                selectedCandidateId === candidate.id
                  ? "ring-2 ring-indigo-600 bg-indigo-50"
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedCandidateId(candidate.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">عدد الأصوات: {candidate.votes}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-indigo-600">{candidate.votes}</div>
                      <p className="text-xs text-gray-500">صوت</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedCandidateId === candidate.id
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedCandidateId === candidate.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vote Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleVote}
            disabled={!selectedCandidateId || voteMutation.isPending}
            className="flex-1 h-12 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
          >
            {voteMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                جاري التصويت...
              </>
            ) : (
              "تصويت"
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            ملاحظة: يمكنك التصويت مرة واحدة فقط من هذا الجهاز
          </p>
        </div>
      </div>
    </div>
  );
}
