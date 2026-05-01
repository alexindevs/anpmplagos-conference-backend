import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

@Injectable()
export class ElectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ─── Voting Settings ───────────────────────────────────────────────────────

  async getSettings() {
    const settings = await this.prisma.votingSettings.findFirst();
    if (!settings) {
      // Auto-create a default row on first access
      return this.prisma.votingSettings.create({ data: {} });
    }
    return settings;
  }

  async toggleVoting(isActive: boolean, adminId: string) {
    const settings = await this.getSettings();
    return this.prisma.votingSettings.update({
      where: { id: settings.id },
      data: {
        isActive,
        activatedAt: isActive ? new Date() : settings.activatedAt,
        deactivatedAt: !isActive ? new Date() : settings.deactivatedAt,
        updatedById: adminId,
      },
    });
  }

  // ─── Positions ─────────────────────────────────────────────────────────────

  async listPositions() {
    return this.prisma.electionPosition.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { candidates: true, votes: true } },
      },
    });
  }

  async createPosition(dto: CreatePositionDto) {
    return this.prisma.electionPosition.create({
      data: {
        title: dto.title,
        description: dto.description,
        order: dto.order ?? 0,
      },
    });
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    await this.findPositionOrThrow(id);
    return this.prisma.electionPosition.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deletePosition(id: string) {
    await this.findPositionOrThrow(id);
    const voteCount = await this.prisma.vote.count({ where: { positionId: id } });
    if (voteCount > 0) {
      throw new ConflictException(
        `Cannot delete — ${voteCount} vote(s) have already been cast for this position.`,
      );
    }
    return this.prisma.electionPosition.delete({ where: { id } });
  }

  // ─── Candidates ────────────────────────────────────────────────────────────

  async listCandidates(positionId: string) {
    await this.findPositionOrThrow(positionId);
    return this.prisma.candidate.findMany({
      where: { positionId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { votes: true } } },
    });
  }

  async createCandidate(
    positionId: string,
    dto: CreateCandidateDto,
    avatarFile?: Express.Multer.File,
  ) {
    await this.findPositionOrThrow(positionId);
    let avatarUrl: string | undefined;
    if (avatarFile) {
      avatarUrl = await this.cloudinary.uploadBuffer(
        avatarFile.buffer,
        `elections/candidates`,
        `candidate-${positionId}`,
        avatarFile.mimetype,
      );
    }
    return this.prisma.candidate.create({
      data: {
        name: dto.name,
        bio: dto.bio,
        avatar: avatarUrl,
        positionId,
      },
    });
  }

  async updateCandidate(
    id: string,
    dto: UpdateCandidateDto,
    avatarFile?: Express.Multer.File,
  ) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    let avatarUrl: string | undefined = candidate.avatar ?? undefined;
    if (avatarFile) {
      avatarUrl = await this.cloudinary.uploadBuffer(
        avatarFile.buffer,
        `elections/candidates`,
        `candidate-${candidate.positionId}`,
        avatarFile.mimetype,
      );
    }
    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        avatar: avatarUrl,
      },
    });
  }

  async deleteCandidate(id: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const voteCount = await this.prisma.vote.count({ where: { candidateId: id } });
    if (voteCount > 0) {
      throw new ConflictException(
        `Cannot delete — ${voteCount} vote(s) have been cast for this candidate.`,
      );
    }
    return this.prisma.candidate.delete({ where: { id } });
  }

  // ─── Results & Stats ───────────────────────────────────────────────────────

  async getResults() {
    const positions = await this.prisma.electionPosition.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        candidates: {
          include: { _count: { select: { votes: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { votes: true } },
      },
    });

    return positions.map((pos) => {
      const totalVotes = pos._count.votes;
      return {
        id: pos.id,
        title: pos.title,
        description: pos.description,
        order: pos.order,
        isActive: pos.isActive,
        totalVotes,
        candidates: pos.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          bio: c.bio,
          avatar: c.avatar,
          voteCount: c._count.votes,
          percentage: totalVotes > 0 ? Math.round((c._count.votes / totalVotes) * 100) : 0,
        })),
      };
    });
  }

  async getStats() {
    const [settings, totalPositions, totalVotes, uniqueVoters] = await Promise.all([
      this.getSettings(),
      this.prisma.electionPosition.count({ where: { isActive: true } }),
      this.prisma.vote.count(),
      this.prisma.vote.groupBy({ by: ['userId'] }).then((r) => r.length),
    ]);

    // Count voters who have voted on ALL active positions
    const allPositionIds = await this.prisma.electionPosition
      .findMany({ where: { isActive: true }, select: { id: true } })
      .then((p) => p.map((x) => x.id));

    let completedVoters = 0;
    if (allPositionIds.length > 0) {
      const counts = await this.prisma.vote.groupBy({
        by: ['userId'],
        where: { positionId: { in: allPositionIds } },
        _count: { positionId: true },
        having: { positionId: { _count: { equals: allPositionIds.length } } },
      });
      completedVoters = counts.length;
    }

    return {
      isActive: settings.isActive,
      activatedAt: settings.activatedAt,
      totalPositions,
      totalVotes,
      uniqueVoters,
      completedVoters,
    };
  }

  // ─── Audit ─────────────────────────────────────────────────────────────────

  async getAuditLog(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [total, votes] = await Promise.all([
      this.prisma.vote.count(),
      this.prisma.vote.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              member: { select: { fullName: true } },
              attendee: { select: { fullName: true } },
            },
          },
          position: { select: { title: true } },
          candidate: { select: { name: true } },
        },
      }),
    ]);

    const data = votes.map((v) => ({
      id: v.id,
      votedAt: v.createdAt,
      voterEmail: v.user.email,
      voterName: v.user.member?.fullName ?? v.user.attendee?.fullName ?? v.user.email,
      positionTitle: v.position.title,
      candidateName: v.candidate.name,
      ipAddress: v.ipAddress,
      userAgent: v.userAgent,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async generateAuditCsv(): Promise<string> {
    const votes = await this.prisma.vote.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            member: { select: { fullName: true } },
            attendee: { select: { fullName: true } },
          },
        },
        position: { select: { title: true } },
        candidate: { select: { name: true } },
      },
    });

    const header = 'id,votedAt,voterEmail,voterName,positionTitle,candidateName,ipAddress,userAgent\n';
    const rows = votes
      .map((v) => {
        const name = v.user.member?.fullName ?? v.user.attendee?.fullName ?? v.user.email;
        const escape = (val: string | null | undefined) =>
          `"${(val ?? '').replace(/"/g, '""')}"`;
        return [
          escape(v.id),
          escape(v.createdAt.toISOString()),
          escape(v.user.email),
          escape(name),
          escape(v.position.title),
          escape(v.candidate.name),
          escape(v.ipAddress),
          escape(v.userAgent),
        ].join(',');
      })
      .join('\n');

    return header + rows;
  }

  // ─── Member Voting ─────────────────────────────────────────────────────────

  async getPublicStatus() {
    const s = await this.getSettings();
    return { isActive: s.isActive, activatedAt: s.activatedAt };
  }

  async getPublicPositions() {
    await this.assertVotingActive();
    return this.prisma.electionPosition.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        candidates: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, bio: true, avatar: true, positionId: true },
        },
      },
    });
  }

  async castVote(
    userId: string,
    regType: string,
    dto: CastVoteDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Only members may vote
    if (regType !== 'member') {
      throw new ForbiddenException('Only registered members can vote.');
    }

    await this.assertVotingActive();

    const position = await this.prisma.electionPosition.findUnique({
      where: { id: dto.positionId },
    });
    if (!position) throw new NotFoundException('Position not found');
    if (!position.isActive) throw new ForbiddenException('This position is not open for voting.');

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: dto.candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (candidate.positionId !== dto.positionId) {
      throw new BadRequestException('Candidate does not belong to the specified position.');
    }

    try {
      return await this.prisma.vote.create({
        data: {
          userId,
          positionId: dto.positionId,
          candidateId: dto.candidateId,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
        include: {
          position: { select: { title: true } },
          candidate: { select: { name: true } },
        },
      });
    } catch (err: any) {
      // Prisma unique constraint violation
      if (err?.code === 'P2002') {
        throw new ConflictException('You have already voted for this position.');
      }
      throw err;
    }
  }

  async getMyVotes(userId: string) {
    return this.prisma.vote.findMany({
      where: { userId },
      select: {
        positionId: true,
        candidateId: true,
        createdAt: true,
        position: { select: { title: true } },
        candidate: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findPositionOrThrow(id: string) {
    const pos = await this.prisma.electionPosition.findUnique({ where: { id } });
    if (!pos) throw new NotFoundException('Position not found');
    return pos;
  }

  private async assertVotingActive() {
    const settings = await this.getSettings();
    if (!settings.isActive) {
      throw new ForbiddenException('Voting is currently closed.');
    }
  }
}
