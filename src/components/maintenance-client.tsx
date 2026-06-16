'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Plus, AlertCircle, Clock, CheckCircle, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { createMaintenanceRequest } from '../actions/maintenance';
import { useTranslations } from 'next-intl';

interface MaintenanceClientProps {
  initialRequests: any[];
  rooms: { id: number; roomNumber: string }[];
}

export function MaintenanceClient({ initialRequests, rooms }: MaintenanceClientProps) {
  const t = useTranslations('maintenance');
  const r = useTranslations("Room");

  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Schema initialized inside the hook wrapper to safely capture current language strings if needed
  const maintenanceSchema = z.object({
    room: z.string().min(1, t('form.validation.room')),
    issue: z.string().min(1, t('form.validation.issue')),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    description: z.string().optional(),
  });

  type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      room: '',
      issue: '',
      priority: 'medium',
      description: '',
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      setErrorMsg(null);
      await createMaintenanceRequest({
        roomNumber: data.room,
        title: data.issue,
        priority: data.priority,
        description: data.description,
      });
      form.reset();
      setOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || t('form.errors.generic'));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return null;
    }
  };

  const stats = [
    {
      label: t('stats.open'),
      value: initialRequests.filter((r) => r.status === 'open').length,
      color: 'text-red-600',
    },
    {
      label: t('stats.inProgress'),
      value: initialRequests.filter((r) => r.status === 'in_progress').length,
      color: 'text-yellow-600',
    },
    {
      label: t('stats.completed'),
      value: initialRequests.filter((r) => r.status === 'completed').length,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> {t('cta.newRequest')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('form.title')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {errorMsg && <p className="text-sm text-destructive font-medium">{errorMsg}</p>}
                
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.labels.roomNumber')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('form.placeholders.room')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.roomNumber}>
                            {r("title")} - {room.roomNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.labels.issue')}</FormLabel>
                      <FormControl>
                        <input
                          placeholder={t('form.placeholders.issue')}
                          {...field}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.labels.priority')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">{t('priorities.low')}</SelectItem>
                          <SelectItem value="medium">{t('priorities.medium')}</SelectItem>
                          <SelectItem value="high">{t('priorities.high')}</SelectItem>
                          <SelectItem value="urgent">{t('priorities.urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('form.labels.description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('form.placeholders.description')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">{t('cta.create')}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
                </div>
                <Wrench className={`w-8 h-8 ${stat.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requests Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">{t('tabs.all')}</TabsTrigger>
              <TabsTrigger value="open">{t('tabs.open')}</TabsTrigger>
              <TabsTrigger value="in-progress">{t('tabs.inProgress')}</TabsTrigger>
              <TabsTrigger value="completed">{t('tabs.completed')}</TabsTrigger>
            </TabsList>

            {['all', 'open', 'in_progress', 'completed'].map((tabValue) => {
              const filtered = tabValue === 'all' 
                ? initialRequests 
                : initialRequests.filter((r) => r.status === tabValue);

              return (
                <TabsContent key={tabValue} value={tabValue === 'in_progress' ? 'in-progress' : tabValue} className="mt-6">
                  <div className="space-y-3">
                    {filtered.map((request) => (
                      <div key={request.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(request.status)}
                            <div>
                              <p className="font-semibold">{t('request.itemTitleFormat', { room: request.room, issue: request.issue })}</p>
                              <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {t('request.metaFormat', {
                                  date: format(new Date(request.date), 'MMM dd, yyyy'),
                                  id: request.assignedTo
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge className={getPriorityColor(request.priority)}>{t(`priorities.${request.priority}`)}</Badge>
                        </div>
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t('noRecords')}</p>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}