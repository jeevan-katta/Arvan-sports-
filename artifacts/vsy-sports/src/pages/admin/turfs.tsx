import { useListTurfs, useApproveTurf, useFeatureTurf, useDeleteTurf } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CheckCircle, XCircle, Star, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTurfsQueryKey } from "@workspace/api-client-react";

export default function AdminTurfs() {
  const { data: turfs, isLoading } = useListTurfs();
  const approveMutation = useApproveTurf();
  const featureMutation = useFeatureTurf();
  const deleteMutation = useDeleteTurf();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleApprove = (id: number, status: "approved" | "rejected") => {
    approveMutation.mutate({
      id,
      data: { status }
    }, {
      onSuccess: () => {
        toast({ title: `Turf ${status}` });
        queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() });
      }
    });
  };

  const handleFeature = (id: number, currentFeatured: boolean) => {
    featureMutation.mutate({
      id,
      data: { featured: !currentFeatured }
    }, {
      onSuccess: () => {
        toast({ title: `Feature status updated` });
        queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this turf?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Turf deleted" });
          queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() });
        }
      });
    }
  };

  if (isLoading) return <div className="p-8">Loading turfs...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Turf Management</h2>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b border-border">
          <CardTitle className="text-base font-bold flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-primary" /> Venues
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Turf</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Price/Hr</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {turfs?.map((turf) => (
                <tr key={turf.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-bold">{turf.name}</p>
                    <p className="text-xs text-muted-foreground">{turf.area}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{turf.ownerName}</td>
                  <td className="px-4 py-3 font-bold text-primary">₹{turf.pricePerHour}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                      turf.status === 'approved' ? 'border-green-500 text-green-600' :
                      turf.status === 'rejected' ? 'border-red-500 text-red-600' :
                      'border-yellow-500 text-yellow-600'
                    }`}>
                      {turf.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`h-8 w-8 p-0 rounded-full ${turf.featured ? 'bg-yellow-500/10 text-yellow-600' : 'text-muted-foreground'}`}
                      onClick={() => handleFeature(turf.id, turf.featured || false)}
                    >
                      <Star className={`h-4 w-4 ${turf.featured ? 'fill-current' : ''}`} />
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {turf.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" className="text-green-600 h-8 w-8 mr-1" onClick={() => handleApprove(turf.id, "approved")}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-600 h-8 w-8 mr-1" onClick={() => handleApprove(turf.id, "rejected")}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(turf.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}